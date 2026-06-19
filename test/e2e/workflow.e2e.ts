// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  apiEnv,
  apiFetch,
  createWorkflowFixture,
  json,
  run8cli,
  track,
  uniqueName,
} from './setup/helpers.js';
import { snapshotJson } from './setup/redact.js';

describe('wf list', () => {
  it('returns a JSON array (default output)', async () => {
    const r = await run8cli(['wf', 'list'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
  });

  it('renders a human table with --table', async () => {
    await createWorkflowFixture();
    const r = await run8cli(['wf', 'list', '--table'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(r.json).toBeUndefined(); // table output is not JSON
    expect(r.stdout).toContain('Name');
  });

  it('matches the list-item JSON contract (golden snapshot)', async () => {
    await createWorkflowFixture({ name: 'list-snapshot-fixture' });
    const list = await run8cli(['wf', 'list'], apiEnv());
    const item = json<Array<{ id: string; name: string }>>(list).find(
      (w) => w.name === 'list-snapshot-fixture',
    )!;
    await expect(snapshotJson(item)).toMatchFileSnapshot('./__snapshots__/wf-list-item.json');
  });
});

describe('wf get', () => {
  it('fetches a workflow by id', async () => {
    const wf = await createWorkflowFixture();
    const r = await run8cli(['wf', 'get', wf.id], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(json<{ id: string }>(r).id).toBe(wf.id);
  });

  it('reports a structured 404 for a missing id', async () => {
    const r = await run8cli(['wf', 'get', 'does-not-exist'], apiEnv());
    expect(r).toFailWithCode('ERR_WORKFLOW_GET');
  });

  it('matches the redacted JSON contract (golden snapshot)', async () => {
    // Fixed name keeps the snapshot deterministic (fresh container per run).
    const wf = await createWorkflowFixture({ name: 'snapshot-fixture' });
    const r = await run8cli(['wf', 'get', wf.id], apiEnv());
    expect(r.exitCode).toBe(0);
    await expect(snapshotJson(r.json)).toMatchFileSnapshot('./__snapshots__/wf-get.json');
  });

  it('reports ERR_NO_API_KEY when the key is absent', async () => {
    const r = await run8cli(['wf', 'get', 'x'], { N8N_URL: apiEnv().N8N_URL, N8N_API_KEY: '' });
    expect(r).toFailWithCode('ERR_NO_API_KEY');
  });
});

describe('wf activate / deactivate', () => {
  it('activates and deactivates a workflow with a trigger', async () => {
    const wf = await createWorkflowFixture({ withTrigger: true });
    const on = await run8cli(['wf', 'activate', wf.id], apiEnv());
    expect(on.exitCode).toBe(0);
    expect(json<{ active: boolean }>(on).active).toBe(true);
    const off = await run8cli(['wf', 'deactivate', wf.id], apiEnv());
    expect(off.exitCode).toBe(0);
    expect(json<{ active: boolean }>(off).active).toBe(false);
  });
});

describe('wf delete', () => {
  it('previews with --dry and does not delete', async () => {
    const wf = await createWorkflowFixture();
    const dry = await run8cli(['wf', 'delete', wf.id, '--dry'], apiEnv());
    expect(dry.exitCode).toBe(0);
    expect(dry.json).toMatchObject({ dryRun: true, deleted: false });
    // Still present
    const got = await run8cli(['wf', 'get', wf.id], apiEnv());
    expect(got.exitCode).toBe(0);
  });

  it('deletes a workflow', async () => {
    const wf = await createWorkflowFixture();
    const del = await run8cli(['wf', 'delete', wf.id], apiEnv());
    expect(del.exitCode).toBe(0);
    expect(del.json).toMatchObject({ id: wf.id, deleted: true });
  });
});

describe('wf publish (PUT-gotcha stripping)', () => {
  it('strips read-only fields so an extra-field payload still updates', async () => {
    const wf = await createWorkflowFixture();
    const dir = mkdtempSync(join(tmpdir(), '8cli-wf-'));
    // A file carrying fields n8n rejects on PUT: active, extra settings, junk.
    const file = join(dir, `${wf.id}_payload.json`);
    writeFileSync(
      file,
      JSON.stringify({
        id: wf.id,
        name: wf.name,
        nodes: [],
        connections: {},
        active: true,
        settings: { executionOrder: 'v1', saveDataSuccessExecution: 'all' },
        junkField: 'should-be-stripped',
      }),
    );
    const pub = await run8cli(['wf', 'publish', '--file', file], apiEnv());
    expect(pub.exitCode).toBe(0);
    const body = json<{ updated: unknown[]; errors: unknown[] }>(pub);
    expect(body.errors).toEqual([]);
    expect(body.updated).toHaveLength(1);
  });
});

describe('wf save + diff (both branches)', () => {
  it('reports no differences right after save, then a raw diff after a local edit', async () => {
    const wf = await createWorkflowFixture({ name: uniqueName('diff') });
    const dir = mkdtempSync(join(tmpdir(), '8cli-diff-'));

    const save = await run8cli(['wf', 'save', '--id', wf.id, '--dir', dir], apiEnv());
    expect(save.exitCode).toBe(0);
    expect(json<{ files: string[] }>(save).files).toHaveLength(1);
    const saved = readdirSync(dir).find((f) => f.startsWith(`${wf.id}_`));
    expect(saved).toMatch(new RegExp(`^${wf.id}_.*\\.json$`)); // {id}_{name}.json convention

    // No-diff branch -> JSON object
    const same = await run8cli(['wf', 'diff', wf.id, '--dir', dir], apiEnv());
    expect(same.exitCode).toBe(0);
    expect(same.json).toMatchObject({ id: wf.id, diff: null });

    // Edit the local file, then the diff branch -> raw unified diff text
    const path = join(dir, saved!);
    const local = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    local.name = `${String(local.name)}-edited`;
    writeFileSync(path, JSON.stringify(local, null, 2) + '\n');
    const diff = await run8cli(['wf', 'diff', wf.id, '--dir', dir], apiEnv());
    expect(diff.exitCode).toBe(0);
    expect(diff.json).toBeUndefined();
    expect(diff.stdout).toContain('---');
    expect(diff.stdout).toContain('+++');
  });
});

describe('wf publish (create / dry / no files)', () => {
  it('creates a new workflow from a file with an unknown id', async () => {
    const dir = mkdtempSync(join(tmpdir(), '8cli-pub-'));
    const name = uniqueName('pub');
    const file = join(dir, 'new_wf.json');
    writeFileSync(
      file,
      JSON.stringify({
        id: 'local-unknown-id',
        name,
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      }),
    );
    const pub = await run8cli(['wf', 'publish', '--file', file], apiEnv());
    expect(pub.exitCode).toBe(0);
    const created = json<{ created: Array<{ id: string; name: string }> }>(pub).created;
    expect(created).toHaveLength(1);
    expect(created[0].id).toBeTruthy();
    expect(created[0].id).not.toBe('local-unknown-id'); // server-assigned id
    const newId = created[0].id;
    track(async () => {
      await apiFetch(`/api/v1/workflows/${newId}`, { method: 'DELETE' });
    });
    const got = await run8cli(['wf', 'get', newId], apiEnv());
    expect(got.exitCode).toBe(0);
    expect(json<{ name: string }>(got).name).toBe(name);
  });

  it('previews a create with --dry without mutating', async () => {
    const before = json<unknown[]>(await run8cli(['wf', 'list'], apiEnv())).length;
    const dir = mkdtempSync(join(tmpdir(), '8cli-pubdry-'));
    const file = join(dir, 'dry_wf.json');
    writeFileSync(
      file,
      JSON.stringify({
        id: 'dry-id',
        name: uniqueName('dry'),
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      }),
    );
    const pub = await run8cli(['wf', 'publish', '--file', file, '--dry'], apiEnv());
    expect(pub.exitCode).toBe(0);
    expect(pub.json).toMatchObject({ dryRun: true });
    const after = json<unknown[]>(await run8cli(['wf', 'list'], apiEnv())).length;
    expect(after).toBe(before); // no mutation
  });

  it('reports ERR_NO_FILES when the workflow dir has nothing to publish', async () => {
    const emptyCwd = mkdtempSync(join(tmpdir(), '8cli-empty-'));
    const r = await run8cli(['wf', 'publish'], apiEnv(), { cwd: emptyCwd });
    expect(r).toFailWithCode('ERR_NO_FILES');
  });
});

describe('wf save (all workflows)', () => {
  it('saves every workflow, one file per workflow in the list', async () => {
    await createWorkflowFixture();
    await createWorkflowFixture();
    const count = json<unknown[]>(await run8cli(['wf', 'list'], apiEnv())).length;
    const dir = mkdtempSync(join(tmpdir(), '8cli-saveall-'));
    const save = await run8cli(['wf', 'save', '--dir', dir], apiEnv());
    expect(save.exitCode).toBe(0);
    expect(json<{ files: string[] }>(save).files).toHaveLength(count);
  });
});
