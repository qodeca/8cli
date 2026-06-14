// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { apiEnv, json, run8cli } from './setup/helpers.js';
import { snapshotJson } from './setup/redact.js';

describe('user list / get', () => {
  it('lists users including the bootstrapped owner', async () => {
    const r = await run8cli(['user', 'list'], apiEnv());
    expect(r.exitCode).toBe(0);
    const users = json<Array<{ id: string; email: string }>>(r);
    expect(Array.isArray(users)).toBe(true);
    expect(users.some((u) => u.email === 'e2e@example.com')).toBe(true);
  });

  it('gets a user by id', async () => {
    const list = await run8cli(['user', 'list'], apiEnv());
    const owner = json<Array<{ id: string; email: string }>>(list).find(
      (u) => u.email === 'e2e@example.com',
    )!;
    const r = await run8cli(['user', 'get', owner.id], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toMatchObject({ id: owner.id, email: 'e2e@example.com' });
  });

  it('reports a structured error for a missing user', async () => {
    const r = await run8cli(['user', 'get', 'no-such-user'], apiEnv());
    expect(r).toFailWithCode('ERR_USER_GET');
  });

  it('matches the user JSON contract (golden snapshot)', async () => {
    const list = await run8cli(['user', 'list'], apiEnv());
    const owner = json<Array<{ id: string; email: string }>>(list).find(
      (u) => u.email === 'e2e@example.com',
    )!;
    const r = await run8cli(['user', 'get', owner.id], apiEnv());
    expect(r.exitCode).toBe(0);
    await expect(snapshotJson(r.json)).toMatchFileSnapshot('./__snapshots__/user-get.json');
  });
});
