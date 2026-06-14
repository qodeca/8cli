// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { json, run8cli } from '../e2e/setup/helpers.js';

// Real-keychain coverage for the auth command group. macOS-only: it shells out
// to the real `security` CLI. `auth verify` is pointed at a local HTTP mock so
// no n8n/Docker is required. A unique loopback URL keeps these entries isolated
// from any real `8cli` keychain items, and afterAll removes them.

const isMac = process.platform === 'darwin';
const FAKE_TOKEN = 'INSECURE-E2E-ONLY-fake-token';

let server: Server;
let url: string;

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
});

afterAll(async () => {
  if (!isMac) return;
  await run8cli(['--url', url, 'auth', 'logout']); // ensure no keychain leak
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
});
