// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiEnv, errorMessage, json, run8cli } from './setup/helpers.js';

describe('config show', () => {
  it('reports the resolved url and masks the api key', async () => {
    const r = await run8cli(['config', 'show'], apiEnv());
    expect(r.exitCode).toBe(0);
    const cfg = json<{ url: string; apiKey: string }>(r);
    expect(cfg.url).toBe(apiEnv().N8N_URL);
    expect(cfg.apiKey).toContain('...'); // masked, never the raw key
    expect(cfg.apiKey).not.toBe(apiEnv().N8N_API_KEY);
  });

  it('applies precedence: a --url flag overrides the N8N_URL env var', async () => {
    const r = await run8cli(['--url', 'http://localhost:9999', 'config', 'show'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(json<{ url: string }>(r).url).toBe('http://localhost:9999');
  });
});

describe('global flags', () => {
  it('--verbose logs to stderr while keeping stdout clean JSON', async () => {
    const r = await run8cli(['wf', 'list', '--verbose'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
    expect(r.stderr).toContain('[8cli]');
  });

  it('rejects a plaintext-HTTP url without --insecure', async () => {
    const r = await run8cli(['--url', 'http://example.com', 'config', 'show'], {});
    expect(r).toFailWithCode('ERR_CONFIG');
  });

  it('allows a plaintext-HTTP url with --insecure', async () => {
    const r = await run8cli(['--url', 'http://example.com', '--insecure', 'config', 'show'], {});
    expect(r.exitCode).toBe(0);
    expect(json<{ url: string }>(r).url).toBe('http://example.com');
  });
});

describe('missing configuration', () => {
  it('reports ERR_NO_URL when no url is resolvable', async () => {
    const r = await run8cli(['wf', 'get', 'x'], { N8N_URL: '', N8N_API_KEY: 'k' });
    expect(r).toFailWithCode('ERR_NO_URL');
  });
});

describe('config source mismatch (#60)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** A cwd holding an 8cli.json that names `url`. */
  function configFileCwd(url: string, nested = false): string {
    const dir = mkdtempSync(join(tmpdir(), '8cli-config-'));
    tempDirs.push(dir);
    const fileDir = nested ? join(dir, 'configs') : dir;
    if (nested) mkdirSync(fileDir);
    writeFileSync(join(fileDir, '8cli.json'), JSON.stringify({ url }));
    return dir;
  }

  it('refuses an env API key when the URL comes from the config file', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9');
    const r = await run8cli(['config', 'show'], { N8N_API_KEY: 'env-key' }, { cwd });
    expect(r).toFailWithCode('ERR_CONFIG_SOURCE_MISMATCH');
    expect(errorMessage(r)).toContain('N8N_URL');
  });

  it('refuses before sending a request, not after a network failure', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9');
    const r = await run8cli(['wf', 'list'], { N8N_API_KEY: 'env-key' }, { cwd });
    expect(r).toFailWithCode('ERR_CONFIG_SOURCE_MISMATCH');
  });

  it('refuses environment email and password before folder login', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9');
    const r = await run8cli(
      ['folder', 'tree'],
      { N8N_EMAIL: 'mail@example.com', N8N_PASSWORD: 'password-secret' },
      { cwd },
    );
    expect(r).toFailWithCode('ERR_CONFIG_SOURCE_MISMATCH');
    expect(errorMessage(r)).toContain('N8N_EMAIL');
    expect(errorMessage(r)).toContain('N8N_PASSWORD');
    expect(r.stderr).not.toContain('password-secret');
  });

  it('refuses a flag API key with an explicit config path', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9');
    const r = await run8cli(
      ['--config', join(cwd, '8cli.json'), '--api-key', 'flag-secret', 'config', 'show'],
      {},
      { cwd },
    );
    expect(r).toFailWithCode('ERR_CONFIG_SOURCE_MISMATCH');
    expect(r.stderr).not.toContain('flag-secret');
  });

  it('refuses a key when config is found under configs/', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9', true);
    const r = await run8cli(['config', 'show'], { N8N_API_KEY: 'env-key' }, { cwd });
    expect(r).toFailWithCode('ERR_CONFIG_SOURCE_MISMATCH');
  });

  it('allows the same key when N8N_URL names the host', async () => {
    const cwd = configFileCwd('https://127.0.0.1:9');
    const r = await run8cli(['config', 'show'], apiEnv(), { cwd });
    expect(r.exitCode).toBe(0);
    expect(json<{ url: string }>(r).url).toBe(apiEnv().N8N_URL);
  });
});
