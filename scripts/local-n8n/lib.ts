// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Pure helpers for scripts/local-n8n/local-n8n.ts, kept apart so they can be unit-tested
// without Docker (test/local-n8n.test.ts).

import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  constants,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

export const COMMANDS = ['start', 'seed', 'reset', 'stop'] as const;
export type Command = (typeof COMMANDS)[number];

/** The protected env file is the only store, on every platform. */
export const STORES = ['env'] as const;
export type Store = (typeof STORES)[number];

export interface ParsedArgs {
  command: Command;
  store: Store;
}

export class UsageError extends Error {}

/** A failure with its own `ERR_*` code, printed as `{ "error", "code" }`. */
export class ScriptError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

export function parseArgs(argv: string[]): ParsedArgs {
  let command: Command | undefined;
  let store: Store = 'env';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--store') {
      const value = argv[i + 1];
      if (value === 'keychain') {
        throw new ScriptError(
          'The keychain store is disabled until the keychain backend keeps secrets out of ' +
            'process arguments; use the env file store (--store env, the default)',
          'ERR_STORE_DISABLED',
        );
      }
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

/** The URL 8cli is pointed at. */
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
 * The credential fields a spawned 8cli needs from the env file. `resolveConfig`
 * (src/config.ts) falls back to the keychain for any of them that is absent, so all three
 * must be set explicitly or the child reads the developer's keychain.
 */
export const CREDENTIAL_FIELDS = ['N8N_API_KEY', 'N8N_EMAIL', 'N8N_PASSWORD'] as const;

/**
 * The explicit `N8N_*` environment for a spawned 8cli, built from the stored values, or a
 * structured error when a credential is missing or empty. Every field is set here, so the
 * child's config resolution can never reach the keychain for a missing one.
 */
export function storedCredentialsEnv(values: Record<string, string>): Record<string, string> {
  const incomplete = CREDENTIAL_FIELDS.filter((field) => (values[field] ?? '').trim() === '');
  if (incomplete.length > 0) {
    throw new ScriptError(
      `The stored credentials are incomplete (missing or empty: ${incomplete.join(', ')}). ` +
        'Run `npm run n8n:local -- reset` to start clean (this deletes the local n8n data), ' +
        'or `npm run n8n:local -- seed` on a fresh instance.',
      'ERR_ENV_FILE_INCOMPLETE',
    );
  }
  return {
    N8N_URL: values.N8N_URL ?? '',
    N8N_API_KEY: values.N8N_API_KEY,
    N8N_EMAIL: values.N8N_EMAIL,
    N8N_PASSWORD: values.N8N_PASSWORD,
  };
}

/**
 * The environment for a spawned 8cli: the host's, minus every `N8N_*` variable, plus
 * `extra`. Without the strip a host `N8N_URL` or `N8N_API_KEY` could leak into the check
 * of the stored credentials, and it would test the wrong key.
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

/**
 * The credentials file for the one local n8n instance, derived from the repository's git
 * common directory. `git rev-parse --git-common-dir` names the MAIN repository's git directory
 * even from a linked worktree, so its parent is the main checkout: the path is the same in the
 * main checkout and in every worktree of it. The container is shared by every worktree (compose
 * project `8cli-local-n8n`), so a worktree-relative path gave each worktree its own credentials
 * for the same instance — only the first one could seed it, and every other got
 * `ERR_ALREADY_OWNED` (issue #38).
 */
export function sharedCredentialsFile(gitCommonDir: string): string {
  return join(dirname(gitCommonDir), '.local', 'xezar', 'n8n', 'credentials.env');
}

/**
 * Write a secret file so no byte of it is ever readable by anyone else: the directory is
 * made 0700, the content goes to a fresh 0600 temp file beside the target (created with
 * O_EXCL, never reused), is fsynced, and is renamed over the target in one step. A
 * symlink, or anything that is not a regular file, at the target is refused.
 */
export function writeSecretFile(path: string, content: string): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);

  let existing: ReturnType<typeof lstatSync> | undefined;
  try {
    existing = lstatSync(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  if (existing?.isSymbolicLink()) {
    throw new ScriptError(`Refusing to write through a symlink at ${path}`, 'ERR_ENV_FILE_SYMLINK');
  }
  if (existing && !existing.isFile()) {
    throw new ScriptError(`${path} exists and is not a regular file`, 'ERR_ENV_FILE_TYPE');
  }

  const temp = join(dir, `.${basename(path)}.${randomBytes(8).toString('hex')}.tmp`);
  const fd = openSync(
    temp,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const data = Buffer.from(content, 'utf-8');
    let offset = 0;
    while (offset < data.length) {
      offset += writeSync(fd, data, offset, data.length - offset);
    }
    fsyncSync(fd);
    closeSync(fd);
    renameSync(temp, path);
  } catch (err) {
    try {
      closeSync(fd);
    } catch {
      /* already closed */
    }
    try {
      unlinkSync(temp);
    } catch {
      /* already gone */
    }
    throw err;
  }
}
