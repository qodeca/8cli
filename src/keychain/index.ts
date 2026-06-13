// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { platform } from 'node:os';

interface KeychainBackend {
  setSecret(account: string, value: string): void;
  getSecret(account: string): string | undefined;
  deleteSecret(account: string): boolean;
  listAccounts(): string[];
}

let backend: KeychainBackend | undefined;

async function getBackend(): Promise<KeychainBackend> {
  if (backend) return backend;

  const os = platform();
  switch (os) {
    case 'darwin':
      backend = await import('./macos.js');
      break;
    case 'win32':
      backend = await import('./windows.js');
      break;
    case 'linux':
      backend = await import('./linux.js');
      break;
    default:
      throw new Error(`Unsupported platform for keychain: ${os}`);
  }
  return backend;
}

export async function setSecret(_service: string, account: string, value: string): Promise<void> {
  const kc = await getBackend();
  kc.setSecret(account, value);
}

export async function getSecret(_service: string, account: string): Promise<string | undefined> {
  const kc = await getBackend();
  return kc.getSecret(account);
}

export async function deleteSecret(_service: string, account: string): Promise<boolean> {
  const kc = await getBackend();
  return kc.deleteSecret(account);
}

export async function listAccounts(_service: string): Promise<string[]> {
  const kc = await getBackend();
  return kc.listAccounts();
}

/** Keychain account name helpers */
export function apiKeyAccount(url: string): string {
  return `${normalizeUrl(url)}/api-key`;
}

export function emailAccount(url: string): string {
  return `${normalizeUrl(url)}/email`;
}

export function passwordAccount(url: string): string {
  return `${normalizeUrl(url)}/password`;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const KEYCHAIN_SERVICE = '8cli';
