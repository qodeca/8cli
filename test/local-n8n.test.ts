// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import {
  childEnv,
  cookieHeader,
  defaultStore,
  envFileContent,
  generatePassword,
  localUrl,
  parseArgs,
  parseEnvFile,
  UsageError,
} from '../scripts/local-n8n/lib.js';

describe('local-n8n parseArgs', () => {
  it('defaults to the keychain on macOS and an env file elsewhere', () => {
    expect(parseArgs(['start'], 'darwin')).toEqual({ command: 'start', store: 'keychain' });
    expect(parseArgs(['start'], 'linux')).toEqual({ command: 'start', store: 'env' });
    expect(defaultStore('win32')).toBe('env');
  });

  it('accepts every command and an explicit store in any order', () => {
    for (const command of ['start', 'seed', 'reset', 'stop']) {
      expect(parseArgs([command], 'darwin').command).toBe(command);
    }
    expect(parseArgs(['--store', 'env', 'seed'], 'darwin')).toEqual({
      command: 'seed',
      store: 'env',
    });
  });

  it('rejects a missing, unknown or repeated command and a bad store', () => {
    expect(() => parseArgs([], 'darwin')).toThrow(UsageError);
    expect(() => parseArgs(['up'], 'darwin')).toThrow(/Unexpected argument "up"/);
    expect(() => parseArgs(['start', 'stop'], 'darwin')).toThrow(UsageError);
    expect(() => parseArgs(['start', '--store'], 'darwin')).toThrow(/--store must be/);
    expect(() => parseArgs(['start', '--store', 'file'], 'darwin')).toThrow(/--store must be/);
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
