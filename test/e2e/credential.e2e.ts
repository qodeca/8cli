// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { apiEnv, apiFetch, run8cli, track, uniqueName } from './setup/helpers.js';

async function makeCredential(): Promise<{ id: string }> {
  const res = await apiFetch('/api/v1/credentials', {
    method: 'POST',
    body: JSON.stringify({
      name: uniqueName('cred'),
      type: 'httpHeaderAuth',
      data: { name: 'X-Token', value: 'secret', allowedDomains: '' },
    }),
  });
  if (!res.ok) throw new Error(`credential fixture create failed: ${res.status}`);
  const cred = (await res.json()) as { id: string };
  track(async () => {
    await apiFetch(`/api/v1/credentials/${cred.id}`, { method: 'DELETE' });
  });
  return cred;
}

describe('cred list', () => {
  it('returns a JSON array', async () => {
    const r = await run8cli(['cred', 'list'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
  });
});

describe('cred delete', () => {
  it('deletes a credential by id', async () => {
    const cred = await makeCredential();
    const r = await run8cli(['cred', 'delete', cred.id], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toMatchObject({ id: cred.id, deleted: true });
  });

  it('reports a structured error for a missing credential', async () => {
    const r = await run8cli(['cred', 'delete', '999999'], apiEnv());
    expect(r).toFailWithCode('ERR_CRED_DELETE');
  });
});

describe('cred transfer', () => {
  it('reports a structured error transferring to an invalid project', async () => {
    const cred = await makeCredential();
    const r = await run8cli(['cred', 'transfer', cred.id, '--to', 'no-such-project'], apiEnv());
    expect(r).toFailWithCode('ERR_CRED_TRANSFER');
  });
});
