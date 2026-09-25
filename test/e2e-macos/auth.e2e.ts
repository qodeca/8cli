// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execa } from 'execa';
import { json, run8cli } from '../e2e/setup/helpers.js';

// Real-keychain coverage for the auth command group. macOS-only: it shells out
// to the real `security` CLI. `auth verify` is pointed at a local HTTP mock so
// no n8n/Docker is required. A unique loopback URL keeps these entries isolated
// from any real `8cli` keychain items, and afterAll removes them.

const isMac = process.platform === 'darwin';
const FAKE_TOKEN = 'INSECURE-E2E-ONLY-fake-token';
const SCRATCH_SERVICE = '8cli-e2e-macos';

let server: Server;
let url: string;
// A URL whose `/api-key` account carries a double quote, a backslash and a
// space, so the real `security -i` parser has to undo our quoting.
let trickyUrl: string;

beforeAll(async () => {
  if (!isMac) return;
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  url = `http://127.0.0.1:${port}`;
  trickyUrl = `${url}/path with "quotes" and \\backslashes`;
});

afterAll(async () => {
  if (!isMac) return;
  await run8cli(['--url', url, 'auth', 'logout']); // ensure no keychain leak
  await run8cli(['--url', trickyUrl, 'auth', 'logout']);
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe.skipIf(!isMac)('auth keychain round-trip (macOS)', () => {
  it('stores, lists, verifies and removes credentials via the real keychain', async () => {
    // set-api-key -> writes to the real macOS keychain
    const set = await run8cli(['--url', url, 'auth', 'set-api-key', '--value', FAKE_TOKEN]);
    expect(set.exitCode).toBe(0);
    expect(set.json).toMatchObject({ url });

    // list -> the instance appears with a stored api key
    const list = await run8cli(['auth', 'list']);
    expect(list.exitCode).toBe(0);
    const entry = json<Array<{ url: string; hasApiKey: boolean }>>(list).find((e) => e.url === url);
    expect(entry).toMatchObject({ hasApiKey: true });

    // verify -> reads the value back from the keychain and hits the local mock
    const verify = await run8cli(['--url', url, 'auth', 'verify']);
    expect(verify.exitCode).toBe(0);
    expect(verify.json).toMatchObject({ url, authenticated: true });

    // logout -> removes the stored value
    const logout = await run8cli(['--url', url, 'auth', 'logout']);
    expect(logout.exitCode).toBe(0);
    expect(logout.json).toMatchObject({ deletedApiKey: true });

    // verify now fails fast with the structured no-key error
    const after = await run8cli(['--url', url, 'auth', 'verify']);
    expect(after).toFailWithCode('ERR_NO_API_KEY');
  });

  it('reads the stored value from stdin with "-"', async () => {
    const set = await run8cli(
      ['--url', url, 'auth', 'set-api-key', '--value', '-'],
      {},
      { input: 'INSECURE-E2E-ONLY-piped-token\n' },
    );
    expect(set.exitCode).toBe(0);
    const verify = await run8cli(['--url', url, 'auth', 'verify']);
    expect(verify.exitCode).toBe(0);
    expect(verify.json).toMatchObject({ authenticated: true });
    await run8cli(['--url', url, 'auth', 'logout']);
  });

  it('stores email + password via set-credentials and removes them', async () => {
    // NOTE: `auth login --api-key` is currently unusable — the global --api-key
    // option shadows the subcommand's, so this covers the email/password storage
    // branch via set-credentials (no option collision) instead.
    const set = await run8cli(
      ['--url', url, 'auth', 'set-credentials', '--email', 'creds@example.com', '--password', '-'],
      {},
      { input: 'INSECURE-E2E-ONLY-creds-pw\n' },
    );
    expect(set.exitCode).toBe(0);
    expect(set.json).toMatchObject({ email: 'creds@example.com' });

    const list = await run8cli(['auth', 'list']);
    const entry = json<Array<{ url: string; hasEmail: boolean; hasPassword: boolean }>>(list).find(
      (e) => e.url === url,
    );
    expect(entry).toMatchObject({ hasEmail: true, hasPassword: true });

    const logout = await run8cli(['--url', url, 'auth', 'logout']);
    expect(logout.json).toMatchObject({ deletedEmail: true, deletedPassword: true });
  });

  it('stores api-key + email + password via auth login (global --api-key)', async () => {
    const login = await run8cli(
      [
        '--url',
        url,
        '--api-key',
        FAKE_TOKEN,
        'auth',
        'login',
        '--email',
        'login@example.com',
        '--password',
        '-',
      ],
      {},
      { input: 'INSECURE-E2E-ONLY-login-pw\n' },
    );
    expect(login.exitCode).toBe(0);
    expect(login.json).toMatchObject({ hasApiKey: true, hasEmail: true, hasPassword: true });

    const list = await run8cli(['auth', 'list']);
    const entry = json<
      Array<{ url: string; hasApiKey: boolean; hasEmail: boolean; hasPassword: boolean }>
    >(list).find((e) => e.url === url);
    expect(entry).toMatchObject({ hasApiKey: true, hasEmail: true, hasPassword: true });

    const logout = await run8cli(['--url', url, 'auth', 'logout']);
    expect(logout.json).toMatchObject({
      deletedApiKey: true,
      deletedEmail: true,
      deletedPassword: true,
    });
  });

  it('round-trips an account name holding a double quote, a backslash and a space', async () => {
    // The account is `{url}/api-key`, so these bytes reach `security -i` inside
    // a quoted argument and exercise the escaping in quoteForSecurityCommand
    // against the real parser. `deletedApiKey: true` on logout proves the item
    // was stored under the exact account name rather than a mangled one.
    const set = await run8cli(['--url', trickyUrl, 'auth', 'set-api-key', '--value', FAKE_TOKEN]);
    expect(set.exitCode).toBe(0);

    const verify = await run8cli(['--url', trickyUrl, 'auth', 'verify']);
    expect(verify.exitCode).toBe(0);
    expect(verify.json).toMatchObject({ url: trickyUrl, authenticated: true });

    const logout = await run8cli(['--url', trickyUrl, 'auth', 'logout']);
    expect(logout.json).toMatchObject({ deletedApiKey: true });
  });

  it('sees a non-zero exit from security -i when add-generic-password fails', async () => {
    // setSecret turns a failed `security -i` into a thrown error, which assumes
    // the real CLI signals failure with a non-zero exit. A duplicate item without
    // -U is a deterministic failure, so prove that assumption here rather than
    // only against a mocked execFileSync.
    const account = `fail-${randomBytes(4).toString('hex')}`;
    await execa('security', ['delete-generic-password', '-s', SCRATCH_SERVICE, '-a', account], {
      reject: false,
    });
    await execa('security', [
      'add-generic-password',
      '-s',
      SCRATCH_SERVICE,
      '-a',
      account,
      '-X',
      '00',
    ]);

    const duplicate = `add-generic-password -s "${SCRATCH_SERVICE}" -a "${account}" -X "00"`;
    const result = await execa('security', ['-i'], {
      input: `${duplicate}\n`,
      reject: false,
    });

    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/already exists/);

    await execa('security', ['delete-generic-password', '-s', SCRATCH_SERVICE, '-a', account], {
      reject: false,
    });
  });
});
