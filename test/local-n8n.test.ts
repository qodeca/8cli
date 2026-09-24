// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  childEnv,
  cookieHeader,
  envFileContent,
  generatePassword,
  legacyCredentialsFiles,
  localUrl,
  parseArgs,
  parseEnvFile,
  readRegularFile,
  ScriptError,
  sharedCredentialsFile,
  storedCredentialsEnv,
  UsageError,
  writeSecretFile,
} from '../scripts/local-n8n/lib.js';

/**
 * The host environment for a child this test spawns, minus every `GIT_*` variable (a git hook
 * or an IDE runner may set `GIT_DIR`, `GIT_WORK_TREE` or `GIT_COMMON_DIR`, which would point the
 * fixture's git calls at the developer's real repository) and every `N8N_*` one.
 */
function isolatedEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_') && !key.startsWith('N8N_')) out[key] = value;
  }
  return { ...out, ...extra };
}

const completeCredentials = {
  N8N_URL: 'http://localhost:5678',
  N8N_API_KEY: 'key',
  N8N_EMAIL: 'owner@example.com',
  N8N_PASSWORD: 'Local8cli-A1',
};

function withoutCredential(key: string): Record<string, string> {
  const values: Record<string, string> = { ...completeCredentials };
  delete values[key];
  return values;
}

/** The three ways a stored env file can be incomplete. */
const incompleteCredentials: Array<[string, Record<string, string>]> = [
  ['a missing API key', withoutCredential('N8N_API_KEY')],
  ['a missing email', withoutCredential('N8N_EMAIL')],
  ['an empty password', { ...completeCredentials, N8N_PASSWORD: '' }],
];

describe('local-n8n parseArgs', () => {
  it('defaults to the env file store', () => {
    expect(parseArgs(['start'])).toEqual({ command: 'start', store: 'env' });
  });

  it('accepts every command and an explicit store in any order', () => {
    for (const command of ['start', 'seed', 'reset', 'stop']) {
      expect(parseArgs([command]).command).toBe(command);
    }
    expect(parseArgs(['--store', 'env', 'seed'])).toEqual({ command: 'seed', store: 'env' });
  });

  it('rejects a missing, unknown or repeated command and a bad store', () => {
    expect(() => parseArgs([])).toThrow(UsageError);
    expect(() => parseArgs(['up'])).toThrow(/Unexpected argument "up"/);
    expect(() => parseArgs(['start', 'stop'])).toThrow(UsageError);
    expect(() => parseArgs(['start', '--store'])).toThrow(/--store must be/);
    expect(() => parseArgs(['start', '--store', 'file'])).toThrow(/--store must be/);
  });

  it('refuses the keychain store with ERR_STORE_DISABLED', () => {
    let caught: unknown;
    try {
      parseArgs(['seed', '--store', 'keychain']);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ScriptError);
    expect((caught as ScriptError).code).toBe('ERR_STORE_DISABLED');
    expect((caught as ScriptError).message).toMatch(/keychain store is disabled/);
  });
});

describe('local-n8n script', () => {
  it('refuses --store keychain with a structured error and exit 1, before touching Docker', () => {
    const refused = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        resolve(import.meta.dirname, '../scripts/local-n8n/local-n8n.ts'),
        'start',
        '--store',
        'keychain',
      ],
      // An empty PATH means docker cannot be found, so reaching it would fail differently.
      { encoding: 'utf-8', input: '', env: isolatedEnv({ PATH: '' }) },
    );
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe('');
    const error = JSON.parse(refused.stderr.trim()) as { error: string; code: string };
    expect(error.code).toBe('ERR_STORE_DISABLED');
    expect(error.error).toMatch(/keychain store is disabled/);
  });

  it('refuses with ERR_GIT_COMMON_DIR when the checkout is not a git repository', () => {
    const notRepo = mkdtempSync(join(tmpdir(), 'local-n8n-norepo-'));
    try {
      const script = copyScript(notRepo);
      const result = runStart(script, gitOnlyPath(notRepo));
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      const error = JSON.parse(result.stderr.trim()) as { error: string; code: string };
      expect(error.code).toBe('ERR_GIT_COMMON_DIR');
      expect(error.error).toMatch(/git common directory/);
    } finally {
      rmSync(notRepo, { recursive: true, force: true });
    }
  });
});

describe('local-n8n localUrl', () => {
  it('uses port 5678 unless N8N_LOCAL_PORT says otherwise', () => {
    expect(localUrl(undefined)).toBe('http://localhost:5678');
    expect(localUrl('5699')).toBe('http://localhost:5699');
  });

  it('rejects a value that is not a port', () => {
    expect(() => localUrl('abc')).toThrow(UsageError);
    expect(() => localUrl('0')).toThrow(UsageError);
    expect(() => localUrl('70000')).toThrow(UsageError);
    expect(() => localUrl('5678/evil')).toThrow(UsageError);
  });
});

describe('local-n8n generatePassword', () => {
  it("meets n8n's password policy", () => {
    for (let i = 0; i < 20; i += 1) {
      const password = generatePassword();
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(password.length).toBeLessThanOrEqual(64);
      expect(password).toMatch(/\d/);
      expect(password).toMatch(/[A-Z]/);
    }
  });

  it('is random per call', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});

describe('local-n8n cookieHeader', () => {
  it('keeps only the name=value part of each cookie', () => {
    expect(cookieHeader(['n8n-auth=abc; Path=/; HttpOnly', 'other=1; Secure'])).toBe(
      'n8n-auth=abc; other=1',
    );
  });
});

describe('local-n8n sharedCredentialsFile', () => {
  it('puts the credentials inside the git common dir, whatever worktree asks', () => {
    // The path git reports as the common dir is the MAIN repository's git dir even when the
    // script runs in a linked worktree. Git never tracks a file inside it, and a bare
    // repository or `--separate-git-dir` cannot move the file into some other work tree.
    expect(sharedCredentialsFile(join('/repo', '.git'))).toBe(
      join('/repo', '.git', '8cli', 'local-n8n', 'credentials.env'),
    );
    expect(sharedCredentialsFile(join('/srv', 'repo.git'))).toBe(
      join('/srv', 'repo.git', '8cli', 'local-n8n', 'credentials.env'),
    );
  });
});

describe('local-n8n legacyCredentialsFiles', () => {
  it("lists this checkout's own old file first, then the main checkout's", () => {
    expect(legacyCredentialsFiles('/wt', join('/main', '.git'))).toEqual([
      join('/wt', '.local', 'xezar', 'n8n', 'credentials.env'),
      join('/main', '.local', 'xezar', 'n8n', 'credentials.env'),
    ]);
  });

  it('lists the main checkout once when the script runs there', () => {
    expect(legacyCredentialsFiles('/main', join('/main', '.git'))).toEqual([
      join('/main', '.local', 'xezar', 'n8n', 'credentials.env'),
    ]);
  });
});

describe('local-n8n readRegularFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-read-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads a regular file and answers undefined for a missing one', () => {
    writeFileSync(join(dir, 'f'), 'content\n');
    expect(readRegularFile(join(dir, 'f'))).toBe('content\n');
    expect(readRegularFile(join(dir, 'missing'))).toBeUndefined();
  });

  it('refuses a symlink with ERR_ENV_FILE_SYMLINK and a directory with ERR_ENV_FILE_TYPE', () => {
    writeFileSync(join(dir, 'real'), 'secret\n');
    symlinkSync(join(dir, 'real'), join(dir, 'link'));
    mkdirSync(join(dir, 'sub'));
    for (const [name, code] of [
      ['link', 'ERR_ENV_FILE_SYMLINK'],
      ['sub', 'ERR_ENV_FILE_TYPE'],
    ]) {
      let caught: unknown;
      try {
        readRegularFile(join(dir, name));
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ScriptError);
      expect((caught as ScriptError).code).toBe(code);
    }
  });
});

describe('local-n8n env file', () => {
  const creds = {
    url: 'http://localhost:5678',
    apiKey: 'key.with.dots',
    email: 'owner@example.com',
    password: "it's-A1",
  };

  it('round-trips every value, including a single quote', () => {
    const parsed = parseEnvFile(envFileContent(creds));
    expect(parsed).toEqual({
      N8N_URL: creds.url,
      N8N_API_KEY: creds.apiKey,
      N8N_EMAIL: creds.email,
      N8N_PASSWORD: creds.password,
    });
  });

  it('quotes values so sourcing the file cannot run anything', () => {
    const content = envFileContent({ ...creds, password: '$(touch x)`id`' });
    expect(content).toContain("N8N_PASSWORD='$(touch x)`id`'");
  });
});

describe('local-n8n childEnv', () => {
  it('drops every host N8N_* variable so the stored credentials are what gets tested', () => {
    const env = childEnv(
      { PATH: '/bin', N8N_API_KEY: 'host-key', N8N_URL: 'https://prod.example.com' },
      { N8N_API_KEY: 'stored' },
    );
    expect(env).toEqual({ PATH: '/bin', N8N_API_KEY: 'stored' });
  });
});

describe('local-n8n storedCredentialsEnv', () => {
  it('passes every credential field to the child explicitly', () => {
    // Every field is present, so `resolveConfig` in the child has nothing to look up in the
    // keychain.
    expect(storedCredentialsEnv(completeCredentials)).toEqual(completeCredentials);
  });

  for (const [name, values] of incompleteCredentials) {
    it(`refuses ${name} with ERR_ENV_FILE_INCOMPLETE`, () => {
      let caught: unknown;
      try {
        storedCredentialsEnv(values);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ScriptError);
      expect((caught as ScriptError).code).toBe('ERR_ENV_FILE_INCOMPLETE');
      expect((caught as ScriptError).message).toMatch(/reset/);
    });
  }
});

/**
 * A PATH that has `git` but neither `docker` nor a keychain helper. The local-n8n script now
 * asks git for the shared credentials location, so an empty PATH would fail before the refusal
 * under test; a wrapper is used instead of git's own directory because on Linux that directory
 * also holds docker. A refusal with ERR_ENV_FILE_INCOMPLETE therefore still proves nothing else
 * was spawned.
 */
function gitOnlyPath(dir: string): string {
  const bin = join(dir, 'git-only-bin');
  mkdirSync(bin, { recursive: true });
  const located = (
    spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).stdout ?? ''
  ).trim();
  if (!located) throw new Error('git is not on PATH');
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nexec ${JSON.stringify(located)} "$@"\n`, {
    mode: 0o755,
  });
  return bin;
}

function git(args: string[], cwd: string): void {
  const res = spawnSync('git', args, { cwd, encoding: 'utf-8', env: isolatedEnv() });
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
}

/** A throwaway git repository so the script can resolve a git common directory. */
function initRepo(dir: string): void {
  git(['init', '-q'], dir);
  git(['config', 'user.email', 'test@example.com'], dir);
  git(['config', 'user.name', 'Local n8n test'], dir);
  // A developer's global commit.gpgsign must not make the fixture hang or fail.
  git(['config', 'commit.gpgsign', 'false'], dir);
  writeFileSync(join(dir, 'README.md'), '# fixture\n');
  git(['add', 'README.md'], dir);
  git(['commit', '-qm', 'init'], dir);
}

/** Copy the script into a checkout and return its path; the checkout is never the developer's. */
function copyScript(root: string): string {
  const scriptDir = join(root, 'scripts', 'local-n8n');
  mkdirSync(scriptDir, { recursive: true });
  for (const file of ['local-n8n.ts', 'lib.ts']) {
    cpSync(resolve(import.meta.dirname, '../scripts/local-n8n', file), join(scriptDir, file));
  }
  return join(scriptDir, 'local-n8n.ts');
}

function runStart(
  script: string,
  path: string,
): { status: number | null; stdout: string; stderr: string } {
  return spawnSync(process.execPath, ['--import', 'tsx', script, 'start'], {
    encoding: 'utf-8',
    input: '',
    // The ceiling keeps git from searching above the temp directory, so a fixture that is
    // deliberately not a repository cannot accidentally find one.
    env: isolatedEnv({ PATH: path, GIT_CEILING_DIRECTORIES: tmpdir() }),
  });
}

/**
 * `runStart` for a script that talks to a fake n8n in this process: `spawnSync` would block the
 * event loop the fake server answers on.
 */
function runScript(
  script: string,
  command: string,
  path: string,
  port: number,
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', script, command], {
      env: isolatedEnv({
        PATH: path,
        GIT_CEILING_DIRECTORIES: tmpdir(),
        N8N_LOCAL_PORT: String(port),
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf-8')));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf-8')));
    child.on('error', reject);
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }));
  });
}

/** The API key the fake 8cli accepts; any other key fails `auth verify`. */
const WORKING_KEY = 'working-key';

/**
 * A stand-in for `bin/8cli.ts` in a fixture checkout: `auth verify` succeeds only with
 * WORKING_KEY. The real CLI would need a real n8n. `node_modules` is linked in so the script's
 * `--import tsx` resolves from the fixture.
 */
function fakeCli(root: string): void {
  mkdirSync(join(root, 'bin'), { recursive: true });
  writeFileSync(
    join(root, 'bin', '8cli.ts'),
    `process.exit(process.env.N8N_API_KEY === ${JSON.stringify(WORKING_KEY)} ? 0 : 1);\n`,
  );
  symlinkSync(resolve(import.meta.dirname, '../node_modules'), join(root, 'node_modules'));
}

/** A fake n8n that is ready and already has an owner, on a free port. */
async function ownedInstance(): Promise<Server> {
  const server = createServer((req, res) => {
    if (req.url === '/healthz/readiness') {
      res.writeHead(200).end('{}');
    } else if (req.url === '/rest/settings') {
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ data: { userManagement: { showSetupOnFirstLoad: false } } }));
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, 'localhost', done));
  return server;
}

function legacyFile(root: string): string {
  return join(root, '.local', 'xezar', 'n8n', 'credentials.env');
}

function writeLegacy(root: string, apiKey: string): void {
  mkdirSync(dirname(legacyFile(root)), { recursive: true });
  writeFileSync(
    legacyFile(root),
    envFileContent({
      url: 'http://localhost:5678',
      apiKey,
      email: 'owner@example.com',
      password: 'Legacy-Secret-9',
    }),
  );
}

describe('local-n8n incomplete stored credentials', () => {
  let dir: string;
  let repo: string;
  let script: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-script-'));
    repo = join(dir, 'checkout');
    mkdirSync(repo);
    initRepo(repo);
    // A copy of the script whose repository root is this temp checkout, so the test reads
    // and writes its own env file, never the developer's shared credentials.
    script = copyScript(repo);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeStoredEnv(values: Record<string, string>): void {
    const shared = sharedCredentialsFile(join(repo, '.git'));
    mkdirSync(dirname(shared), { recursive: true });
    const content = Object.entries(values)
      .map(([key, value]) => `${key}='${value}'`)
      .join('\n');
    writeFileSync(shared, `${content}\n`);
  }

  for (const [name, values] of incompleteCredentials) {
    it(`refuses ${name} before spawning any child process`, () => {
      writeStoredEnv(values);

      const result = runStart(script, gitOnlyPath(dir));

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      const error = JSON.parse(result.stderr.trim()) as { error: string; code: string };
      expect(error.code).toBe('ERR_ENV_FILE_INCOMPLETE');
      expect(error.error).toMatch(/reset/);
      // No child process ran: docker prints nothing, and its absence would surface as
      // ERR_NO_DOCKER instead of this refusal.
      expect(result.stderr).not.toContain('[local-n8n]');
    });
  }
});

describe('local-n8n shared credentials across worktrees', () => {
  let dir: string;
  let mainRepo: string;
  let worktree: string;
  let worktreeScript: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-worktree-'));
    mainRepo = join(dir, 'main');
    mkdirSync(mainRepo);
    initRepo(mainRepo);
    copyScript(mainRepo);
    worktree = join(dir, 'worktree');
    git(['worktree', 'add', '-q', worktree, '-b', 'side'], mainRepo);
    worktreeScript = copyScript(worktree);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads the credentials stored in the git common dir, not its own worktree copy', () => {
    // Regression, issue #38: the one local n8n instance is shared by every worktree, but the
    // credentials were resolved under the checkout that ran the command. This worktree found
    // no file in its own `.local/xezar/n8n/` and went on to Docker (ERR_NO_DOCKER). With the
    // shared location it reads the file in the common git dir and refuses it as incomplete,
    // before Docker is reached.
    const shared = sharedCredentialsFile(join(mainRepo, '.git'));
    mkdirSync(dirname(shared), { recursive: true });
    writeFileSync(shared, "N8N_API_KEY=''\n");

    const result = runStart(worktreeScript, gitOnlyPath(dir));

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    const error = JSON.parse(result.stderr.trim()) as { error: string; code: string };
    expect(error.code).toBe('ERR_ENV_FILE_INCOMPLETE');
    // The worktree never gets a credentials file of its own.
    expect(existsSync(join(worktree, '.local', 'xezar', 'n8n', 'credentials.env'))).toBe(false);
  });
});

describe('local-n8n adopting a per-checkout credentials file', () => {
  // Before #38 every checkout kept its own `.local/xezar/n8n/credentials.env`. An instance a
  // worktree seeded then has an owner, the new shared file is absent, and `reset` would wipe the
  // data. `seed` checks the old files and adopts one only after `auth verify` accepts it.
  let dir: string;
  let mainRepo: string;
  let worktree: string;
  let worktreeScript: string;
  let shared: string;
  let server: Server;
  let port: number;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-adopt-'));
    mainRepo = join(dir, 'main');
    mkdirSync(mainRepo);
    initRepo(mainRepo);
    worktree = join(dir, 'worktree');
    git(['worktree', 'add', '-q', worktree, '-b', 'side'], mainRepo);
    worktreeScript = copyScript(worktree);
    fakeCli(worktree);
    shared = sharedCredentialsFile(join(mainRepo, '.git'));
    server = await ownedInstance();
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise((done) => server.close(done));
    rmSync(dir, { recursive: true, force: true });
  });

  it("adopts the worktree's own working file into the shared location", async () => {
    writeLegacy(worktree, WORKING_KEY);

    const result = await runScript(worktreeScript, 'seed', gitOnlyPath(dir), port);

    expect(result.stderr).not.toContain('"code"');
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout) as {
      seeded: string;
      credentials: { store: string; envFile: string; adoptedFrom: string };
    };
    expect(out.seeded).toBe('adopted');
    expect(out.credentials).toEqual({
      store: 'env',
      envFile: shared,
      adoptedFrom: legacyFile(worktree),
    });
    // No value is ever printed.
    expect(result.stdout + result.stderr).not.toContain(WORKING_KEY);
    expect(result.stdout + result.stderr).not.toContain('Legacy-Secret-9');
    expect(parseEnvFile(readFileSync(shared, 'utf-8'))).toMatchObject({
      N8N_API_KEY: WORKING_KEY,
      N8N_EMAIL: 'owner@example.com',
      N8N_PASSWORD: 'Legacy-Secret-9',
    });
    expect(statSync(shared).mode & 0o777).toBe(0o600);
    expect(statSync(dirname(shared)).mode & 0o777).toBe(0o700);
  }, 60_000);

  it("adopts the main checkout's old file when the worktree has none", async () => {
    writeLegacy(mainRepo, WORKING_KEY);

    const result = await runScript(worktreeScript, 'seed', gitOnlyPath(dir), port);

    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout) as { credentials: { adoptedFrom: string } };
    expect(out.credentials.adoptedFrom).toBe(legacyFile(mainRepo));
    expect(existsSync(shared)).toBe(true);
  }, 60_000);

  it('does not adopt a file auth verify rejects, and names it with a copy step', async () => {
    writeLegacy(worktree, 'stale-key');

    const result = await runScript(worktreeScript, 'seed', gitOnlyPath(dir), port);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    const error = JSON.parse(result.stderr.trim().split('\n').pop() ?? '') as {
      error: string;
      code: string;
    };
    expect(error.code).toBe('ERR_ALREADY_OWNED');
    expect(error.error).toContain(legacyFile(worktree));
    expect(error.error).toContain(shared);
    expect(error.error).toMatch(/cp /);
    expect(error.error).not.toContain('stale-key');
    expect(existsSync(shared)).toBe(false);
  }, 60_000);

  it('refuses a symlink at the old location and adopts nothing', async () => {
    const elsewhere = join(dir, 'elsewhere.env');
    writeFileSync(
      elsewhere,
      envFileContent({
        url: 'http://localhost:5678',
        apiKey: WORKING_KEY,
        email: 'owner@example.com',
        password: 'Legacy-Secret-9',
      }),
    );
    mkdirSync(dirname(legacyFile(worktree)), { recursive: true });
    symlinkSync(elsewhere, legacyFile(worktree));

    const result = await runScript(worktreeScript, 'seed', gitOnlyPath(dir), port);

    expect(result.status).toBe(1);
    const error = JSON.parse(result.stderr.trim().split('\n').pop() ?? '') as { code: string };
    expect(error.code).toBe('ERR_ENV_FILE_SYMLINK');
    expect(existsSync(shared)).toBe(false);
  }, 60_000);
});

describe('local-n8n writeSecretFile', () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-'));
    target = join(dir, 'n8n', 'credentials.env');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the file 0600 in a 0700 directory', () => {
    writeSecretFile(target, 'N8N_API_KEY=new\n');
    expect(readFileSync(target, 'utf-8')).toBe('N8N_API_KEY=new\n');
    expect(statSync(target).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, 'n8n')).mode & 0o777).toBe(0o700);
  });

  it('replaces a pre-existing 0644 file with a 0600 one holding the new content', () => {
    mkdirSync(join(dir, 'n8n'));
    writeFileSync(target, 'old\n');
    chmodSync(target, 0o644);
    expect(statSync(target).mode & 0o777).toBe(0o644);
    const before = statSync(target).ino;

    writeSecretFile(target, 'N8N_API_KEY=new\n');

    expect(readFileSync(target, 'utf-8')).toBe('N8N_API_KEY=new\n');
    expect(statSync(target).mode & 0o777).toBe(0o600);
    // A new inode: the secret never went into the old, readable file.
    expect(statSync(target).ino).not.toBe(before);
    expect(readdirSync(join(dir, 'n8n'))).toEqual(['credentials.env']);
  });

  it('refuses a symlink at the target and leaves the link and its target alone', () => {
    mkdirSync(join(dir, 'n8n'));
    const elsewhere = join(dir, 'elsewhere.txt');
    writeFileSync(elsewhere, 'untouched\n', { mode: 0o644 });
    symlinkSync(elsewhere, target);

    let caught: unknown;
    try {
      writeSecretFile(target, 'N8N_API_KEY=new\n');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ScriptError);
    expect((caught as ScriptError).code).toBe('ERR_ENV_FILE_SYMLINK');
    expect(lstatSync(target).isSymbolicLink()).toBe(true);
    expect(readFileSync(elsewhere, 'utf-8')).toBe('untouched\n');
    expect(readdirSync(join(dir, 'n8n'))).toEqual(['credentials.env']);
  });
});
