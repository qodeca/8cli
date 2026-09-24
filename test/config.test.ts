// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertSecureUrl, maskApiKey, resolveConfig } from '../src/config.js';
import { apiKeyAccount, getSecret } from '../src/keychain/index.js';

// The real keychain is never touched by a unit test: the lookup is stubbed, so a
// config-file URL with no env key still exercises the per-URL keychain path
// without running the macOS `security` CLI.
vi.mock('../src/keychain/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/keychain/index.js')>();
  return { ...actual, getSecret: vi.fn(async () => undefined) };
});

const getSecretMock = vi.mocked(getSecret);

/**
 * Run `fn` and return the structured error it refused with. `outputError` ends
 * the process, so `process.exit` is stubbed to unwind instead of exiting the
 * test runner, and `process.stderr.write` is captured.
 */
async function captureRefusal(
  fn: () => Promise<unknown>,
): Promise<{ error: string; code: string }> {
  let stderr = '';
  const write = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderr += String(chunk);
    return true;
  });
  const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
  try {
    await fn();
    throw new Error('expected the run to refuse, but it resolved');
  } catch (err) {
    if (!(err instanceof Error) || err.message !== 'process.exit called') throw err;
    return JSON.parse(stderr) as { error: string; code: string };
  } finally {
    write.mockRestore();
    exit.mockRestore();
  }
}

const tempDirs: string[] = [];

/** Write an 8cli.json holding `url` and return its path. */
function writeConfigFile(url: string): string {
  const dir = mkdtempSync(join(tmpdir(), '8cli-config-'));
  tempDirs.push(dir);
  const file = join(dir, '8cli.json');
  writeFileSync(file, JSON.stringify({ url }));
  return file;
}

afterEach(() => {
  vi.unstubAllEnvs();
  getSecretMock.mockClear();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('assertSecureUrl', () => {
  it('accepts https URLs', () => {
    expect(() => assertSecureUrl('https://n8n.example.com')).not.toThrow();
  });

  it('accepts http on loopback hosts', () => {
    expect(() => assertSecureUrl('http://localhost:5678')).not.toThrow();
    expect(() => assertSecureUrl('http://127.0.0.1:5678')).not.toThrow();
  });

  it('accepts http on the IPv6 loopback address', () => {
    // The WHATWG URL parser returns IPv6 hosts in bracketed form (`[::1]`), and
    // normalises every spelling of the address to that same form.
    expect(() => assertSecureUrl('http://[::1]:5678')).not.toThrow();
    expect(() => assertSecureUrl('http://[0:0:0:0:0:0:0:1]:5678')).not.toThrow();
  });

  it('rejects http on remote hosts', () => {
    expect(() => assertSecureUrl('http://n8n.example.com')).toThrow(/insecure/i);
  });

  it('does not echo URL userinfo in a plaintext-HTTP error', () => {
    expect(() => assertSecureUrl('http://user:password@n8n.example.com/path')).toThrow(
      /http:\/\/n8n\.example\.com/,
    );
    try {
      assertSecureUrl('http://user:password@n8n.example.com/path');
    } catch (error) {
      expect(String(error)).not.toContain('user:password');
    }
  });

  it('rejects http on non-loopback IPv6 hosts', () => {
    expect(() => assertSecureUrl('http://[::2]:5678')).toThrow(/insecure/i);
    // The loopback exemption stays narrow: IPv4-mapped forms are not accepted.
    expect(() => assertSecureUrl('http://[::ffff:127.0.0.1]:5678')).toThrow(/insecure/i);
  });

  it('accepts https regardless of the host family', () => {
    expect(() => assertSecureUrl('https://n8n.example.com')).not.toThrow();
    expect(() => assertSecureUrl('https://[::2]:5678')).not.toThrow();
    expect(() => assertSecureUrl('https://[::1]:5678')).not.toThrow();
  });

  it('allows http on remote hosts when insecure override is set', () => {
    expect(() => assertSecureUrl('http://n8n.example.com', true)).not.toThrow();
  });

  it('ignores an empty URL', () => {
    expect(() => assertSecureUrl('')).not.toThrow();
  });
});

describe('resolveConfig key/URL source matching (#60)', () => {
  it('refuses an env API key when the URL comes from the config file', async () => {
    const config = writeConfigFile('https://other-host.example.com');
    vi.stubEnv('N8N_URL', '');
    vi.stubEnv('N8N_API_KEY', 'env-key');

    const refusal = await captureRefusal(() => resolveConfig({ config }));

    expect(refusal.code).toBe('ERR_CONFIG_SOURCE_MISMATCH');
    expect(refusal.error).toContain('N8N_URL');
    expect(refusal.error).not.toContain('env-key');
    expect(getSecretMock).not.toHaveBeenCalled();
  });

  it('refuses a --api-key when the URL comes from the config file', async () => {
    const config = writeConfigFile('https://other-host.example.com');
    vi.stubEnv('N8N_URL', '');
    vi.stubEnv('N8N_API_KEY', '');

    const refusal = await captureRefusal(() => resolveConfig({ config, apiKey: 'flag-key' }));

    expect(refusal.code).toBe('ERR_CONFIG_SOURCE_MISMATCH');
    expect(refusal.error).toContain('N8N_URL');
    expect(refusal.error).not.toContain('flag-key');
    expect(getSecretMock).not.toHaveBeenCalled();
  });

  it.each([
    ['N8N_EMAIL', 'mail@example.com', 'N8N_PASSWORD', ''],
    ['N8N_EMAIL', '', 'N8N_PASSWORD', 'password-secret'],
    ['N8N_EMAIL', 'mail@example.com', 'N8N_PASSWORD', 'password-secret'],
  ])(
    'refuses environment login credentials with a config-file URL (%s=%s, %s=%s)',
    async (emailName, email, passwordName, password) => {
      const config = writeConfigFile('https://other-host.example.com');
      vi.stubEnv('N8N_URL', '');
      vi.stubEnv('N8N_API_KEY', '');
      vi.stubEnv(emailName, email);
      vi.stubEnv(passwordName, password);

      const refusal = await captureRefusal(() => resolveConfig({ config }));

      expect(refusal.code).toBe('ERR_CONFIG_SOURCE_MISMATCH');
      if (email) expect(refusal.error).toContain('N8N_EMAIL');
      if (password) expect(refusal.error).toContain('N8N_PASSWORD');
      expect(refusal.error).not.toContain('mail@example.com');
      expect(refusal.error).not.toContain('password-secret');
      expect(getSecretMock).not.toHaveBeenCalled();
    },
  );

  it('prints only the origin of a config-file URL with userinfo', async () => {
    const config = writeConfigFile('https://user:password@other-host.example.com/path');
    vi.stubEnv('N8N_API_KEY', 'env-key');
    const refusal = await captureRefusal(() => resolveConfig({ config }));
    expect(refusal.error).toContain('https://other-host.example.com');
    expect(refusal.error).not.toContain('user:password');
    expect(refusal.error).not.toContain('/path');
  });

  it.each(['flag', 'env'])('uses an API key with a %s URL over a config file', async (source) => {
    const config = writeConfigFile('https://other-host.example.com');
    vi.stubEnv('N8N_URL', source === 'env' ? 'https://n8n.example.com' : '');
    vi.stubEnv('N8N_API_KEY', 'env-key');

    const resolved = await resolveConfig({
      config,
      ...(source === 'flag' ? { url: 'https://n8n.example.com' } : {}),
    });

    expect(resolved.url).toBe('https://n8n.example.com');
    expect(resolved.apiKey).toBe('env-key');
  });

  it('uses environment login credentials with an environment URL over a config file', async () => {
    const config = writeConfigFile('https://other-host.example.com');
    vi.stubEnv('N8N_URL', 'https://n8n.example.com');
    vi.stubEnv('N8N_EMAIL', 'mail@example.com');
    vi.stubEnv('N8N_PASSWORD', 'password-secret');
    const resolved = await resolveConfig({ config });
    expect(resolved.email).toBe('mail@example.com');
    expect(resolved.password).toBe('password-secret');
  });

  it('uses an env API key with an env URL', async () => {
    vi.stubEnv('N8N_URL', 'https://n8n.example.com');
    vi.stubEnv('N8N_API_KEY', 'env-key');

    const resolved = await resolveConfig({});

    expect(resolved.url).toBe('https://n8n.example.com');
    expect(resolved.apiKey).toBe('env-key');
  });

  it('uses a --api-key with a --url', async () => {
    vi.stubEnv('N8N_URL', '');
    vi.stubEnv('N8N_API_KEY', '');

    const resolved = await resolveConfig({ url: 'https://n8n.example.com', apiKey: 'flag-key' });

    expect(resolved.url).toBe('https://n8n.example.com');
    expect(resolved.apiKey).toBe('flag-key');
  });

  it('keeps a config-file URL with a keychain key looked up per URL', async () => {
    const config = writeConfigFile('https://n8n.example.com');
    vi.stubEnv('N8N_URL', '');
    vi.stubEnv('N8N_API_KEY', '');
    getSecretMock.mockResolvedValueOnce('keychain-key');

    const resolved = await resolveConfig({ config });

    expect(resolved.url).toBe('https://n8n.example.com');
    expect(resolved.apiKey).toBe('keychain-key');
    expect(getSecretMock).toHaveBeenCalledWith('8cli', apiKeyAccount('https://n8n.example.com'));
  });

  it('does not refuse a config-file URL when no API key is available', async () => {
    const config = writeConfigFile('https://n8n.example.com');
    vi.stubEnv('N8N_URL', '');
    vi.stubEnv('N8N_API_KEY', '');

    const resolved = await resolveConfig({ config });

    expect(resolved.url).toBe('https://n8n.example.com');
    expect(resolved.apiKey).toBe('');
  });
});

describe('maskApiKey', () => {
  it('reports a placeholder when no key is set', () => {
    expect(maskApiKey('')).toBe('(not set)');
  });

  it('fully masks short keys', () => {
    expect(maskApiKey('abc123')).toBe('****');
  });

  it('shows first and last four characters of long keys', () => {
    expect(maskApiKey('abcdefghijklmnop')).toBe('abcd...mnop');
  });
});
