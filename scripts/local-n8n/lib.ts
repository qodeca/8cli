// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Pure helpers for scripts/local-n8n/local-n8n.ts, kept apart so they can be unit-tested
// without Docker (test/local-n8n.test.ts).

import { randomBytes } from 'node:crypto';

export const COMMANDS = ['start', 'seed', 'reset', 'stop'] as const;
export type Command = (typeof COMMANDS)[number];

export const STORES = ['keychain', 'env'] as const;
export type Store = (typeof STORES)[number];

export interface ParsedArgs {
  command: Command;
  store: Store;
}

export class UsageError extends Error {}

/** The macOS keychain is the only one 8cli implements; everywhere else use an env file. */
export function defaultStore(platform: NodeJS.Platform): Store {
  return platform === 'darwin' ? 'keychain' : 'env';
}

export function parseArgs(argv: string[], platform: NodeJS.Platform): ParsedArgs {
  let command: Command | undefined;
  let store = defaultStore(platform);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--store') {
      const value = argv[i + 1];
      if (!(STORES as readonly string[]).includes(value ?? '')) {
        throw new UsageError(`--store must be one of: ${STORES.join(', ')}`);
      }
      store = value as Store;
      i += 1;
    } else if ((COMMANDS as readonly string[]).includes(arg) && !command) {
      command = arg as Command;
    } else {
      throw new UsageError(`Unexpected argument "${arg}"`);
    }
  }
  if (!command) {
    throw new UsageError(`Missing command: one of ${COMMANDS.join(', ')}`);
  }
  return { command, store };
}

/** The URL 8cli is pointed at; the keychain entries are keyed by this exact string. */
export function localUrl(port: string | undefined): string {
  const value = port ?? '5678';
  if (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new UsageError(`N8N_LOCAL_PORT must be a port number, got "${value}"`);
  }
  return `http://localhost:${value}`;
}

/**
 * A random owner password that meets n8n's policy (8–64 characters, at least one digit
 * and one uppercase letter). The fixed prefix guarantees both classes.
 */
export function generatePassword(random: (size: number) => Buffer = randomBytes): string {
  return `Local8cli-${random(18).toString('base64url')}`;
}

/** `Set-Cookie` values reduced to a `Cookie` request header. */
export function cookieHeader(setCookie: string[]): string {
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

export interface Credentials {
  url: string;
  apiKey: string;
  email: string;
  password: string;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Body of the env file 8cli reads through `N8N_*` (load with `set -a; . <file>; set +a`). */
export function envFileContent(creds: Credentials): string {
  return [
    '# Local n8n credentials written by `npm run n8n:local -- seed`. Do not commit.',
    `N8N_URL=${shellQuote(creds.url)}`,
    `N8N_API_KEY=${shellQuote(creds.apiKey)}`,
    `N8N_EMAIL=${shellQuote(creds.email)}`,
    `N8N_PASSWORD=${shellQuote(creds.password)}`,
    '',
  ].join('\n');
}

/** Read the `N8N_*` values back out of an env file written by `envFileContent`. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const match = /^(N8N_[A-Z_]+)='(.*)'$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/'\\''/g, "'");
  }
  return out;
}

/**
 * The environment for a spawned 8cli: the host's, minus every `N8N_*` variable, plus
 * `extra`. Without the strip a host `N8N_API_KEY` would shadow the keychain entry the
 * seed just wrote, and the check would test the wrong key.
 */
export function childEnv(
  host: NodeJS.ProcessEnv,
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(host)) {
    if (!key.startsWith('N8N_')) out[key] = value;
  }
  return { ...out, ...extra };
}
