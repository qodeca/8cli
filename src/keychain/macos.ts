// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { execFileSync } from 'node:child_process';

const SERVICE = '8cli';

/**
 * Store a secret in macOS Keychain.
 * -U flag updates existing entry if present.
 */
export function setSecret(account: string, value: string): void {
  try {
    execFileSync(
      'security',
      ['add-generic-password', '-s', SERVICE, '-a', account, '-w', value, '-U'],
      { stdio: 'pipe' },
    );
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
