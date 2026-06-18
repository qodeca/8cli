// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

export function setSecret(_account: string, _value: string): void {
  throw new Error(
    'Secret storage via the keychain is not yet implemented on Windows. ' +
      'Set the N8N_API_KEY (and N8N_EMAIL / N8N_PASSWORD) environment variables instead.',
  );
}

export function getSecret(_account: string): string | undefined {
  throw new Error(
    'Secret storage via the keychain is not yet implemented on Windows. ' +
      'Set the N8N_API_KEY (and N8N_EMAIL / N8N_PASSWORD) environment variables instead.',
  );
}

export function deleteSecret(_account: string): boolean {
  throw new Error(
    'Secret storage via the keychain is not yet implemented on Windows. ' +
      'Set the N8N_API_KEY (and N8N_EMAIL / N8N_PASSWORD) environment variables instead.',
  );
}

export function listAccounts(): string[] {
  throw new Error(
    'Secret storage via the keychain is not yet implemented on Windows. ' +
      'Set the N8N_API_KEY (and N8N_EMAIL / N8N_PASSWORD) environment variables instead.',
  );
}
