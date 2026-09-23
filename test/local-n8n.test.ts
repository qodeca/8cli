// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
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
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  childEnv,
  cookieHeader,
  envFileContent,
  generatePassword,
  localUrl,
  parseArgs,
  parseEnvFile,
  ScriptError,
  storedCredentialsEnv,
  UsageError,
  writeSecretFile,
} from '../scripts/local-n8n/lib.js';

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
      { encoding: 'utf-8', input: '', env: { ...process.env, PATH: '' } },
    );
    expect(refused.status).toBe(1);
    expect(refused.stdout).toBe('');
    const error = JSON.parse(refused.stderr.trim()) as { error: string; code: string };
    expect(error.code).toBe('ERR_STORE_DISABLED');
    expect(error.error).toMatch(/keychain store is disabled/);
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

describe('local-n8n incomplete stored credentials', () => {
  let dir: string;
  let scriptDir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'local-n8n-script-'));
    scriptDir = join(dir, 'scripts', 'local-n8n');
    mkdirSync(scriptDir, { recursive: true });
    // A copy of the script whose repository root is this temp directory, so the test reads
    // and writes its own env file, never the developer's `.local/xezar/n8n/credentials.env`.
    for (const file of ['local-n8n.ts', 'lib.ts']) {
      cpSync(resolve(import.meta.dirname, '../scripts/local-n8n', file), join(scriptDir, file));
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeStoredEnv(values: Record<string, string>): void {
    const envDir = join(dir, '.local', 'xezar', 'n8n');
    mkdirSync(envDir, { recursive: true });
    const content = Object.entries(values)
      .map(([key, value]) => `${key}='${value}'`)
      .join('\n');
    writeFileSync(join(envDir, 'credentials.env'), `${content}\n`);
  }

  function start(): { status: number | null; stdout: string; stderr: string } {
    return spawnSync(
      process.execPath,
      ['--import', 'tsx', join(scriptDir, 'local-n8n.ts'), 'start'],
      // An empty PATH means neither docker nor a keychain helper can be found, so reaching
      // one would fail differently. A refusal with ERR_ENV_FILE_INCOMPLETE therefore proves
      // nothing was spawned.
      { encoding: 'utf-8', input: '', env: { ...process.env, PATH: '' } },
    );
  }

  for (const [name, values] of incompleteCredentials) {
    it(`refuses ${name} before spawning any child process`, () => {
      writeStoredEnv(values);

      const result = start();

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
