// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

export function setSecret(_account: string, _value: string): void {
  throw new Error('Linux keychain not yet supported');
}

export function getSecret(_account: string): string | undefined {
  throw new Error('Linux keychain not yet supported');
}

export function deleteSecret(_account: string): boolean {
  throw new Error('Linux keychain not yet supported');
}

export function listAccounts(): string[] {
  throw new Error('Linux keychain not yet supported');
}
