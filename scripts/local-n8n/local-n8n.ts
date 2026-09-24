// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Local n8n 2.40.5 for checking 8cli by hand and by agents (docs/runbooks/local-n8n.md).
//
//   npm run n8n:local -- start   bring it up and seed it when it is fresh
//   npm run n8n:local -- seed    create the owner and an API key, store them for 8cli
//   npm run n8n:local -- reset   wipe all data, start again, seed
//   npm run n8n:local -- stop    stop it, keeping the data
//
// The seed stores the credentials in a protected env file (mode 600) in the MAIN checkout,
// shared by every git worktree (the compose project name is fixed, so every worktree targets
// one container), so the whole repository seeds and reads one instance. `--store keychain` is
// refused: the keychain store is disabled until the keychain backend keeps secrets out of
// process arguments. Same contract as 8cli: one JSON object to stdout, errors as
// `{ "error", "code" }` to stderr with exit code 1, progress to stderr. No secret is ever
// printed or passed in process arguments. A spawned 8cli only ever sees a complete set of
// stored credentials, so its config resolution cannot fall back to the keychain.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  childEnv,
  cookieHeader,
  envFileContent,
  generatePassword,
  localUrl,
  parseArgs,
  parseEnvFile,
  ScriptError,
  sharedCredentialsFile,
  storedCredentialsEnv,
  UsageError,
  writeSecretFile,
} from './lib.js';

const ROOT = resolve(import.meta.dirname, '../..');
const COMPOSE_FILE = resolve(import.meta.dirname, 'compose.yaml');
const CLI_ENTRY = resolve(ROOT, 'bin/8cli.ts');
const OWNER_EMAIL = 'owner@example.com';
const READY_TIMEOUT_MS = 180_000;
const REQUEST_TIMEOUT_MS = 15_000;

function progress(message: string): void {
  process.stderr.write(`[local-n8n] ${message}\n`);
}

/**
 * The git directory shared by every worktree of this repository. `git rev-parse
 * --git-common-dir` answers the MAIN repository's git dir even from a linked worktree, so
 * `sharedCredentialsFile` derives a path that is the same in the main checkout and in every
 * worktree of it. Resolved lazily, after argument parsing, so the `--store keychain` refusal
 * still happens before any child process is spawned.
 */
function gitCommonDir(): string {
  const res = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: ROOT,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.error || res.status !== 0) {
    throw new ScriptError(
      'Could not resolve the git common directory, so the shared local-n8n credentials file ' +
        'cannot be located. Run this from a checkout of the repository.',
      'ERR_GIT_COMMON_DIR',
    );
  }
  const dir = (res.stdout ?? '').trim();
  if (dir === '') {
    throw new ScriptError(
      'git returned an empty common directory, so the shared local-n8n credentials file ' +
        'cannot be located. Run this from a checkout of the repository.',
      'ERR_GIT_COMMON_DIR',
    );
  }
  return dir;
}

/** The shared credentials file, next to the one instance rather than inside a worktree. */
let envFileCache: string | undefined;
function envFile(): string {
  envFileCache ??= sharedCredentialsFile(gitCommonDir());
  return envFileCache;
}

function compose(...args: string[]): void {
  // Docker's own output goes to stderr so stdout stays one JSON object.
  const res = spawnSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
    cwd: ROOT,
    stdio: ['ignore', 2, 2],
  });
  if (res.error) {
    throw new ScriptError(`Could not run docker: ${res.error.message}`, 'ERR_NO_DOCKER');
  }
  if (res.status !== 0) {
    throw new ScriptError(
      `docker compose ${args[0]} failed (exit ${res.status})`,
      'ERR_DOCKER_COMPOSE',
    );
  }
}

async function request(
  url: string,
  init: RequestInit = {},
): Promise<{ status: number; json: Record<string, unknown>; setCookie: string[] }> {
  const res = await fetch(url, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty or non-JSON body */
  }
  return { status: res.status, json, setCookie: res.headers.getSetCookie?.() ?? [] };
}

async function waitReady(url: string): Promise<void> {
  progress(`waiting for ${url}/healthz/readiness`);
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/healthz/readiness`, { signal: AbortSignal.timeout(5_000) });
      if (res.ok) return;
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new ScriptError(
    `n8n did not become ready within ${READY_TIMEOUT_MS / 1000}s`,
    'ERR_NOT_READY',
  );
}

/** The running n8n's version, read inside the container (settings hide it before login). */
function n8nVersion(): string | undefined {
  const res = spawnSync(
    'docker',
    ['compose', '-f', COMPOSE_FILE, 'exec', '-T', 'n8n', 'n8n', '--version'],
    { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  return res.status === 0 ? res.stdout.trim() || undefined : undefined;
}

async function needsOwnerSetup(url: string): Promise<boolean> {
  const res = await request(`${url}/rest/settings`);
  const data = res.json.data as { userManagement?: { showSetupOnFirstLoad?: boolean } } | undefined;
  if (res.status !== 200 || !data) {
    throw new ScriptError(`GET /rest/settings returned ${res.status}`, 'ERR_SETTINGS');
  }
  return data.userManagement?.showSetupOnFirstLoad === true;
}

/** Run 8cli from source; credentials reach it through the environment, never argv. */
function run8cli(
  args: string[],
  opts: { env?: Record<string, string> } = {},
): { status: number | null; stdout: string; stderr: string } {
  // The child's environment is built from the stored values, with every credential field set
  // explicitly, so its config resolution has nothing to look up in the keychain. This is the
  // spawn boundary: an incomplete set is refused before the child is spawned.
  const credentials = storedCredentialsEnv(opts.env ?? {});
  const res = spawnSync(process.execPath, ['--import', 'tsx', CLI_ENTRY, ...args], {
    cwd: ROOT,
    input: '',
    env: childEnv(process.env, credentials),
    encoding: 'utf-8',
  });
  if (res.error) {
    throw new ScriptError(`Could not run 8cli: ${res.error.message}`, 'ERR_RUN_8CLI');
  }
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

function storeCredentials(creds: {
  url: string;
  apiKey: string;
  email: string;
  password: string;
}): void {
  writeSecretFile(envFile(), envFileContent(creds));
}

/**
 * The explicit environment for a spawned 8cli, read from the stored file, or `undefined`
 * when the file does not exist. An env file that exists but is incomplete is refused here,
 * so a child can never resolve a missing credential from the keychain.
 */
function storedEnv(): Record<string, string> | undefined {
  const file = envFile();
  if (!existsSync(file)) return undefined;
  return storedCredentialsEnv(parseEnvFile(readFileSync(file, 'utf-8')));
}

/** `8cli auth verify` against the instance with the stored credentials. */
function verifyStored(url: string): boolean {
  const env = storedEnv();
  if (!env) return false;
  return run8cli(['--url', url, 'auth', 'verify'], { env }).status === 0;
}

async function createOwnerAndKey(url: string): Promise<void> {
  const password = generatePassword();
  progress(`creating the owner ${OWNER_EMAIL}`);
  const setup = await request(`${url}/rest/owner/setup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: OWNER_EMAIL,
      firstName: 'Local',
      lastName: 'Owner',
      password,
    }),
  });
  const cookie = cookieHeader(setup.setCookie);
  if (setup.status !== 200 || !cookie) {
    throw new ScriptError(`Owner setup failed (status ${setup.status})`, 'ERR_OWNER_SETUP');
  }

  // Ask n8n which scopes a public-API key may hold, and grant them all.
  const scopes = await request(`${url}/rest/api-keys/scopes`, { headers: { cookie } });
  const scopeList = (scopes.json.data as string[] | undefined) ?? [];
  if (scopes.status !== 200 || scopeList.length === 0) {
    throw new ScriptError(`No API-key scopes (status ${scopes.status})`, 'ERR_API_KEY_SCOPES');
  }

  progress('creating the API key');
  const key = await request(`${url}/rest/api-keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ label: '8cli-local', expiresAt: null, scopes: scopeList }),
  });
  const apiKey = (key.json.data as { rawApiKey?: string } | undefined)?.rawApiKey;
  if (!apiKey) {
    throw new ScriptError(`API-key creation failed (status ${key.status})`, 'ERR_API_KEY_CREATE');
  }

  progress('writing the env file');
  storeCredentials({ url, apiKey, email: OWNER_EMAIL, password });
}

async function seed(url: string): Promise<'created' | 'already'> {
  if (await needsOwnerSetup(url)) {
    await createOwnerAndKey(url);
    if (!verifyStored(url)) {
      throw new ScriptError('8cli auth verify failed with the new API key', 'ERR_VERIFY');
    }
    return 'created';
  }
  if (verifyStored(url)) {
    return 'already';
  }
  throw new ScriptError(
    'n8n already has an owner, but 8cli has no working credentials for it in the ' +
      'env file. Run `npm run n8n:local -- reset` to start clean (this deletes the local ' +
      'n8n data).',
    'ERR_ALREADY_OWNED',
  );
}

function credentialsLocation(): Record<string, string> {
  return { store: 'env', envFile: envFile() };
}

async function main(): Promise<void> {
  const { command } = parseArgs(process.argv.slice(2));
  const url = localUrl(process.env.N8N_LOCAL_PORT);

  if (command === 'stop') {
    compose('stop');
    process.stdout.write(`${JSON.stringify({ command, url, status: 'stopped' })}\n`);
    return;
  }

  // Refuse an incomplete env file before any child process is spawned: a spawned 8cli would
  // resolve the missing credential from the keychain. `reset` rewrites the file, so it is
  // exempt.
  if (command !== 'reset') storedEnv();

  if (command === 'reset') {
    progress('removing the container and its data volume');
    compose('down', '--volumes', '--remove-orphans');
  }
  if (command !== 'seed') {
    compose('up', '--detach', '--wait');
  }
  await waitReady(url);
  const seeded = await seed(url);
  const result = {
    command,
    url,
    version: n8nVersion(),
    seeded,
    credentials: credentialsLocation(),
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((err: unknown) => {
  const code =
    err instanceof ScriptError
      ? err.code
      : err instanceof UsageError
        ? 'ERR_USAGE'
        : 'ERR_LOCAL_N8N';
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${JSON.stringify({ error: message, code })}\n`);
  process.exit(1);
});
