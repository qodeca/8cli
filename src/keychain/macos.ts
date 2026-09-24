// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { execFileSync } from 'node:child_process';

const SERVICE = '8cli';

/**
 * `security -i` reads its input one line at a time into a fixed 4096-byte
 * buffer, so a line of 4095 bytes plus the trailing newline is the most that
 * fits. The limit is measured in UTF-8 bytes, not UTF-16 code units: a
 * multi-byte account name (a raw user URL) is longer in bytes than
 * `String#length` suggests. A longer line is split in two, which leaves a
 * half-written item behind and echoes the tail of the payload in an error
 * message, so an oversized command is rejected before anything is spawned.
 * 4000 is a conservative round number below the 4095-byte ceiling.
 */
export const MAX_LINE_BYTES = 4000;

/**
 * Quote a value for a `security -i` command line. `security -i` parses the
 * commands it reads from stdin itself (there is no shell), and inside a
 * double-quoted argument only `\` and `"` are special.
 */
function quoteForSecurityCommand(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Store a secret in macOS Keychain.
 * -U flag updates existing entry if present.
 *
 * The secret travels to `security` on stdin, as `-X <hex>` (password data given
 * as a hexadecimal string) in a command fed to `security -i`. It is never part
 * of the process argument list, where another local process could read it from
 * the process table while `security` runs (GHSA-h6g4-mq8c-5chp).
 *
 * The documented prompt form – `-w` last, value typed on stdin – is not used:
 * `security` reads it through a 128-byte buffer and silently stores only that
 * prefix, which real n8n API keys exceed.
 */
export function setSecret(account: string, value: string): void {
  // `security -i` reads one command per line, so a newline in an account name
  // would split the command and could echo the hex-encoded secret back in an
  // error message.
  if (/[\r\n]/.test(account)) {
    throw new Error('Failed to store secret in keychain: account name contains a newline');
  }

  const hex = Buffer.from(value, 'utf8').toString('hex');
  const command = [
    'add-generic-password',
    '-s',
    quoteForSecurityCommand(SERVICE),
    '-a',
    quoteForSecurityCommand(account),
    '-U',
    '-X',
    quoteForSecurityCommand(hex),
  ].join(' ');
  if (Buffer.byteLength(command + '\n', 'utf8') > MAX_LINE_BYTES) {
    throw new Error(
      `Failed to store secret in keychain: value is too long for the security CLI ` +
        `(${Buffer.byteLength(value, 'utf8')} bytes)`,
    );
  }

  try {
    execFileSync('security', ['-i'], { input: `${command}\n`, stdio: 'pipe' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to store secret in keychain: ${msg}`, { cause: err });
  }
}

/**
 * Retrieve a secret from macOS Keychain.
 * Returns undefined if not found.
 */
export function getSecret(account: string): string | undefined {
  try {
    const result = execFileSync(
      'security',
      ['find-generic-password', '-s', SERVICE, '-a', account, '-w'],
      { stdio: 'pipe' },
    );
    return result.toString().trim();
  } catch {
    return undefined;
  }
}

/**
 * Delete a secret from macOS Keychain.
 */
export function deleteSecret(account: string): boolean {
  try {
    execFileSync('security', ['delete-generic-password', '-s', SERVICE, '-a', account], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * List accounts stored under the 8cli service.
 * Parses `security dump-keychain` output for entries matching our service.
 */
export function listAccounts(): string[] {
  try {
    const output = execFileSync('security', ['dump-keychain'], {
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024,
    }).toString();

    const accounts: string[] = [];
    const lines = output.split('\n');
    let inOurService = false;

    for (const line of lines) {
      // Detect service attribute: 0x00000007 <blob>="8cli" or "svce"<blob>="8cli"
      if (
        line.includes(`"svce"<blob>="${SERVICE}"`) ||
        line.includes(`0x00000007 <blob>="${SERVICE}"`)
      ) {
        inOurService = true;
        continue;
      }

      if (inOurService) {
        // Look for account attribute: "acct"<blob>="..."
        const acctMatch = line.match(/"acct"<blob>="([^"]+)"/);
        if (acctMatch) {
          accounts.push(acctMatch[1]);
          inOurService = false;
          continue;
        }
        // If we hit the next keychain entry without finding acct, reset
        if (line.startsWith('keychain:') || line.trim().startsWith('class:')) {
          inOurService = false;
        }
      }
    }

    return accounts;
  } catch {
    return [];
  }
}
