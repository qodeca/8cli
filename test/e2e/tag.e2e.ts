// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import {
  apiEnv,
  apiFetch,
  errorMessage,
  json,
  run8cli,
  track,
  uniqueName,
} from './setup/helpers.js';

async function makeTag(): Promise<{ id: string; name: string }> {
  const name = uniqueName('tag');
  const r = await run8cli(['tag', 'create', name], apiEnv());
  const id = json<{ id: string }>(r).id;
  track(async () => {
    await apiFetch(`/api/v1/tags/${id}`, { method: 'DELETE' });
  });
  return { id, name };
}

describe('tag lifecycle', () => {
  it('creates, lists, updates and deletes a tag', async () => {
    const tag = await makeTag();

    const list = await run8cli(['tag', 'list'], apiEnv());
    expect(list.exitCode).toBe(0);
    expect(json<Array<{ id: string }>>(list).some((t) => t.id === tag.id)).toBe(true);

    const renamed = `${tag.name}-renamed`;
    const upd = await run8cli(['tag', 'update', tag.id, '--name', renamed], apiEnv());
    expect(upd.exitCode).toBe(0);
    expect(upd.json).toMatchObject({ id: tag.id, name: renamed });

    const del = await run8cli(['tag', 'delete', tag.id], apiEnv());
    expect(del.exitCode).toBe(0);
    expect(del.json).toMatchObject({ id: tag.id, deleted: true });
  });

  it('renders tags as a table with --table', async () => {
    await makeTag();
    const r = await run8cli(['tag', 'list', '--table'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toBeUndefined();
  });

  it('reports a structured error deleting a missing tag', async () => {
    const r = await run8cli(['tag', 'delete', '999999'], apiEnv());
    expect(r).toFailWithCode('ERR_TAG_DELETE');
  });

  it('relays n8n refusing a duplicate name, and a rename of a missing tag', async () => {
    const tag = await makeTag();
    const dup = await run8cli(['tag', 'create', tag.name], apiEnv());
    expect(dup).toFailWithCode('ERR_TAG_CREATE');
    expect(errorMessage(dup)).toBe('Tag already exists');
    const list = json<Array<{ name: string }>>(await run8cli(['tag', 'list'], apiEnv()));
    expect(list.filter((t) => t.name === tag.name)).toHaveLength(1); // no second tag

    const missing = await run8cli(['tag', 'update', '999999', '--name', uniqueName('t')], apiEnv());
    expect(missing).toFailWithCode('ERR_TAG_UPDATE');
  });
});
