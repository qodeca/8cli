// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiEnv, apiFetch, json, run8cli, track, uniqueName } from './setup/helpers.js';
import { snapshotJson } from './setup/redact.js';

const COLUMNS = '[{"name":"label","type":"string"}]';

async function makeTable(): Promise<{ id: string; name: string }> {
  const name = uniqueName('dt');
  const r = await run8cli(['dt', 'create', '--name', name, '--columns', COLUMNS], apiEnv());
  if (r.exitCode !== 0) throw new Error(`dt create failed: ${r.stderr}`);
  const id = json<{ id: string }>(r).id;
  track(async () => {
    await apiFetch(`/api/v1/data-tables/${id}`, { method: 'DELETE' });
  });
  return { id, name };
}

describe('datatable lifecycle', () => {
  it('creates, lists, gets, inserts (--data and --stdin), reads rows and deletes', async () => {
    const dt = await makeTable();

    const list = await run8cli(['dt', 'list'], apiEnv());
    expect(list.exitCode).toBe(0);
    expect(json<Array<{ id: string }>>(list).some((t) => t.id === dt.id)).toBe(true);

    const get = await run8cli(['dt', 'get', dt.id], apiEnv());
    expect(get.exitCode).toBe(0);
    expect(json<{ id: string }>(get).id).toBe(dt.id);

    const insData = await run8cli(['dt', 'insert', dt.id, '--data', '[{"label":"a"}]'], apiEnv());
    expect(insData.exitCode).toBe(0);
    expect(insData.json).toMatchObject({ insertedRows: 1 });

    const insStdin = await run8cli(['dt', 'insert', dt.id, '--stdin'], apiEnv(), {
      input: '[{"label":"b"}]',
    });
    expect(insStdin.exitCode).toBe(0);
    expect(insStdin.json).toMatchObject({ insertedRows: 1 });

    const rows = await run8cli(['dt', 'rows', dt.id], apiEnv());
    expect(rows.exitCode).toBe(0);
    expect(json<unknown[]>(rows).length).toBeGreaterThanOrEqual(2);

    const del = await run8cli(['dt', 'delete', dt.id], apiEnv());
    expect(del.exitCode).toBe(0);
    expect(del.json).toMatchObject({ id: dt.id, deleted: true });
  });

  it('inserts from a @file', async () => {
    const dt = await makeTable();
    const dir = mkdtempSync(join(tmpdir(), '8cli-dt-'));
    const file = join(dir, 'rows.json');
    writeFileSync(file, '[{"label":"from-file"}]');
    const r = await run8cli(['dt', 'insert', dt.id, '--data', `@${file}`], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toMatchObject({ insertedRows: 1 });
  });
});

describe('datatable --dry and input errors', () => {
  it('previews create without applying', async () => {
    const r = await run8cli(
      ['dt', 'create', '--name', uniqueName('dt'), '--columns', COLUMNS, '--dry'],
      apiEnv(),
    );
    expect(r.exitCode).toBe(0);
    expect(r.json).toMatchObject({ dry: true, action: 'create' });
  });

  it('previews insert without applying', async () => {
    const dt = await makeTable();
    const r = await run8cli(
      ['dt', 'insert', dt.id, '--data', '[{"label":"x"}]', '--dry'],
      apiEnv(),
    );
    expect(r.exitCode).toBe(0);
    expect(r.json).toMatchObject({ dry: true, action: 'insert', rowCount: 1 });
  });

  it('errors when neither --data nor --stdin is given', async () => {
    const dt = await makeTable();
    const r = await run8cli(['dt', 'insert', dt.id], apiEnv());
    expect(r).toFailWithCode('ERR_MISSING_DATA');
  });
});

describe('datatable malformed input', () => {
  it('rejects invalid --columns JSON', async () => {
    const r = await run8cli(
      ['dt', 'create', '--name', uniqueName('dt'), '--columns', 'not json'],
      apiEnv(),
    );
    expect(r).toFailWithCode('ERR_INVALID_JSON');
  });

  it('rejects non-array row data', async () => {
    const r = await run8cli(['dt', 'insert', 'any-id', '--data', '{"not":"array"}'], apiEnv());
    expect(r).toFailWithCode('ERR_INVALID_DATA');
  });

  it('rejects an unreadable @file', async () => {
    const r = await run8cli(['dt', 'insert', 'any-id', '--data', '@/no/such/file.json'], apiEnv());
    expect(r).toFailWithCode('ERR_FILE_READ');
  });
});

describe('datatable rows --limit and --table', () => {
  it('caps rows with --limit', async () => {
    const dt = await makeTable();
    await run8cli(['dt', 'insert', dt.id, '--data', '[{"label":"a"},{"label":"b"}]'], apiEnv());
    const rows = await run8cli(['dt', 'rows', dt.id, '--limit', '1'], apiEnv());
    expect(rows.exitCode).toBe(0);
    expect(json<unknown[]>(rows).length).toBeLessThanOrEqual(1);
  });

  it('renders the column formatter in --table output', async () => {
    await makeTable(); // has a "label" column
    const r = await run8cli(['dt', 'list', '--table'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toBeUndefined();
    expect(r.stdout).toContain('label'); // custom columns formatter joins column names
  });

  it('matches the data-table JSON contract (golden snapshot)', async () => {
    const created = await run8cli(
      ['dt', 'create', '--name', 'snapshot-dt', '--columns', COLUMNS],
      apiEnv(),
    );
    const id = json<{ id: string }>(created).id;
    track(async () => {
      await apiFetch(`/api/v1/data-tables/${id}`, { method: 'DELETE' });
    });
    const r = await run8cli(['dt', 'get', id], apiEnv());
    expect(r.exitCode).toBe(0);
    await expect(snapshotJson(r.json)).toMatchFileSnapshot('./__snapshots__/dt-get.json');
  });
});
