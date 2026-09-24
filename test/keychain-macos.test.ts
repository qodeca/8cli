// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setSecret } from '../src/keychain/macos.js';

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
