// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LINE_BYTES, setSecret } from '../src/keychain/macos.js';

const { execFileSyncMock } = vi.hoisted(() => ({ execFileSyncMock: vi.fn() }));

vi.mock('node:child_process', () => ({ execFileSync: execFileSyncMock }));

const ACCOUNT = 'https://n8n.example.com/api-key';

interface SpawnCall {
  command: string;
  args: string[];
  input: string;
}

/** The single `security` invocation `setSecret` is expected to make. */
function spawnCall(): SpawnCall {
  expect(execFileSyncMock).toHaveBeenCalledTimes(1);
  const [command, args, options] = execFileSyncMock.mock.calls[0] as [
    string,
    string[],
    { input?: string },
  ];
  return { command, args, input: options.input ?? '' };
}

/** The value `security` will store, decoded from the `-X` hex payload on stdin. */
function storedValue(input: string): string | undefined {
  const hex = input.match(/-X "([0-9a-f]*)"/)?.[1];
  return hex === undefined ? undefined : Buffer.from(hex, 'hex').toString('utf8');
}

describe('macos keychain setSecret', () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
    execFileSyncMock.mockReturnValue(Buffer.from(''));
  });

  // Regression: src/keychain/macos.ts used to spawn
  // `security add-generic-password -s 8cli -a <account> -w <value> -U`, so the
  // secret sat in the argument list and any local process could read it from
  // the process table. Putting the value back into argv makes this test fail on
  // the assertion below.
  it('never puts the secret in the spawned arguments', () => {
    const secret = 'INSECURE-TEST-ONLY-api-key';

    setSecret(ACCOUNT, secret);

    const { command, args } = spawnCall();
    expect(command).toBe('security');
    expect(args.join(' ')).not.toContain(secret);
    expect(JSON.stringify(args)).not.toContain(secret);
  });

  it('keeps the secret out of argv for a value with shell- and argv-hostile bytes', () => {
    const secret = 'pässwörd with "quotes", \\backslashes\\ and\nnewlines';

    setSecret(ACCOUNT, secret);

    const { args } = spawnCall();
    expect(args.join(' ')).not.toContain(secret);
    expect(args.join(' ')).not.toContain('pässwörd');
    expect(args.join(' ')).not.toContain('newlines');
  });

  it('still stores the exact value, handed to security on stdin', () => {
    const secret = 'pässwörd with "quotes", \\backslashes\\ and\nnewlines';

    setSecret(ACCOUNT, secret);

    const { input } = spawnCall();
    expect(storedValue(input)).toBe(secret);
    expect(input).toContain(`-a "${ACCOUNT}"`);
    expect(input).toContain('-U');
    expect(input).toContain('-X ');
  });

  it('round-trips an empty secret', () => {
    setSecret(ACCOUNT, '');

    const { input } = spawnCall();
    expect(storedValue(input)).toBe('');
  });

  it('round-trips a value longer than the 128-byte interactive prompt buffer', () => {
    const secret = 'k'.repeat(300);

    setSecret(ACCOUNT, secret);

    expect(storedValue(spawnCall().input)).toBe(secret);
  });

  it('refuses an account name that would split the stdin command line', () => {
    expect(() => setSecret('https://n8n.example.com/a\nb/api-key', 'secret')).toThrow(
      /account name contains a newline/,
    );
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('refuses a value whose command line would overflow the security input buffer', () => {
    expect(() => setSecret(ACCOUNT, 'k'.repeat(4000))).toThrow(
      /value is too long for the security CLI/,
    );
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  // Regression: src/keychain/macos.ts measured the command line with
  // `command.length`, which counts UTF-16 code units. 'é' is two UTF-8 bytes
  // but one code unit, so an account made of them read as well under the limit
  // while the bytes `security -i` actually reads overflowed its 4096-byte
  // buffer and split the line. Measuring bytes makes this throw before spawn.
  it('refuses a multi-byte account whose code-unit length fits but byte length does not', () => {
    const account = `https://n8n.example.com/${'é'.repeat(2000)}/api-key`;
    let message = '';
    try {
      setSecret(account, '');
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toMatch(/value is too long for the security CLI/);
    expect(message).not.toContain(account);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('accepts an ASCII line exactly at the byte limit and refuses one byte more', () => {
    // Measure the real line `setSecret` emits for a plain ASCII account, so the
    // boundary is derived from the production format rather than a copy of it.
    setSecret('a', '');
    const overhead = Buffer.byteLength(spawnCall().input, 'utf8') - 'a'.length;
    execFileSyncMock.mockClear();

    const maxAccount = 'a'.repeat(MAX_LINE_BYTES - overhead);
    setSecret(maxAccount, '');
    expect(Buffer.byteLength(spawnCall().input, 'utf8')).toBe(MAX_LINE_BYTES);

    execFileSyncMock.mockClear();
    expect(() => setSecret(`${maxAccount}a`, '')).toThrow(/value is too long for the security CLI/);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('reports the rejected value size in UTF-8 bytes, not code units', () => {
    const value = 'é'.repeat(4000); // 4000 code units, 8000 UTF-8 bytes
    let message = '';
    try {
      setSecret(ACCOUNT, value);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('(8000 bytes)');
    expect(message).not.toContain(ACCOUNT);
    expect(message).not.toContain(value);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('reports a keychain failure without echoing the secret', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('Command failed: security -i');
    });

    expect(() => setSecret(ACCOUNT, 'INSECURE-TEST-ONLY-failing-key')).toThrow(
      /Failed to store secret in keychain/,
    );
    const { args } = spawnCall();
    expect(args.join(' ')).not.toContain('INSECURE-TEST-ONLY-failing-key');
  });
});
