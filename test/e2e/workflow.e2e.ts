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
  errorMessage,
  json,
  run8cli,
  STILL_UNPUBLISHING,
  track,
  uniqueName,
  waitFor,
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

  // #44: n8n 2.40 marks /activate and /deactivate deprecated and serves /publish and
  // /unpublish instead. `--verbose` makes the CLI log the request path, so the endpoint
  // it actually called is observable black-box; without the fix the first line is
  // /activate and this test fails. The fallback for n8n without those routes (2.25.7
  // answers 405) is covered by the unit test in test/workflow-activate-endpoints.test.ts.
  it('uses the non-deprecated /publish and /unpublish endpoints on n8n 2.40', async () => {
    const wf = await createWorkflowFixture({ withTrigger: true });

    const on = await run8cli(['--verbose', 'wf', 'activate', wf.id], apiEnv());
    expect(on.exitCode).toBe(0);
    expect(on.stderr).toContain(`/api/v1/workflows/${wf.id}/publish`);
    expect(on.stderr).not.toContain(`/api/v1/workflows/${wf.id}/activate`);

    const off = await run8cli(['--verbose', 'wf', 'deactivate', wf.id], apiEnv());
    expect(off.exitCode).toBe(0);
    expect(off.stderr).toContain(`/api/v1/workflows/${wf.id}/unpublish`);
    expect(off.stderr).not.toContain(`/api/v1/workflows/${wf.id}/deactivate`);
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

// ── n8n 2.40.5 validation (#32) ──────────────────────────────────────────────

const SCHEDULE_NODE = {
  id: 'sched1',
  name: 'Schedule',
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position: [0, 0],
  parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
};

describe('wf delete of a published workflow (changed in n8n 2.40, #43)', () => {
  it('is refused while active and succeeds after deactivate', async () => {
    const wf = await createWorkflowFixture({ withTrigger: true });
    expect((await run8cli(['wf', 'activate', wf.id], apiEnv())).exitCode).toBe(0);

    const refused = await run8cli(['wf', 'delete', wf.id], apiEnv());
    expect(refused).toFailWithCode('ERR_WORKFLOW_DELETE');
    expect(refused.stderr).toContain('Cannot delete a published workflow');
    expect((await run8cli(['wf', 'get', wf.id], apiEnv())).exitCode).toBe(0); // nothing half-deleted

    expect((await run8cli(['wf', 'deactivate', wf.id], apiEnv())).exitCode).toBe(0);
    // Unpublishing settles asynchronously in 2.40: a delete straight after
    // deactivate may get a transient 409, which is the only refusal retried.
    const del = await waitFor('wf delete after deactivate', async () => {
      const r = await run8cli(['wf', 'delete', wf.id], apiEnv());
      if (r.exitCode === 0) return r;
      expect(r).toFailWithCode('ERR_WORKFLOW_DELETE');
      expect(errorMessage(r)).toContain(STILL_UNPUBLISHING);
      return undefined;
    });
    expect(del.json).toEqual({ id: wf.id, deleted: true });
    expect(await run8cli(['wf', 'get', wf.id], apiEnv())).toFailWithCode('ERR_WORKFLOW_GET');
  });
});

describe('wf publish to an active workflow', () => {
  it('updates the published version, not only the draft', async () => {
    const wf = await createWorkflowFixture({ withTrigger: true });
    expect((await run8cli(['wf', 'activate', wf.id], apiEnv())).exitCode).toBe(0);
    const dir = mkdtempSync(join(tmpdir(), '8cli-live-'));
    expect((await run8cli(['wf', 'save', '--id', wf.id, '--dir', dir], apiEnv())).exitCode).toBe(0);
    const path = join(dir, readdirSync(dir)[0]);
    const local = JSON.parse(readFileSync(path, 'utf-8')) as {
      nodes: Array<typeof SCHEDULE_NODE>;
    };
    local.nodes[0].parameters.rule.interval[0].hoursInterval = 2;
    writeFileSync(path, JSON.stringify(local));

    const pub = await run8cli(['wf', 'publish', '--file', path], apiEnv());
    expect(pub.exitCode).toBe(0);
    expect(json<{ errors: unknown[] }>(pub).errors).toEqual([]);

    const remote = (await (await apiFetch(`/api/v1/workflows/${wf.id}`)).json()) as {
      active: boolean;
      versionId: string;
      activeVersionId: string | null;
      activeVersion: { nodes: Array<typeof SCHEDULE_NODE> } | null;
    };
    expect(remote.active).toBe(true);
    expect(remote.activeVersionId).toBe(remote.versionId);
    expect(remote.activeVersion?.nodes[0].parameters.rule.interval[0].hoursInterval).toBe(2);
  });
});

describe('n8n PUT /workflows/{id} gotchas (CLAUDE.md)', () => {
  // Raw requests: these lock n8n's side of the boundary that stripForPublish()
  // relies on, so a future n8n bump shows exactly which rule moved.
  async function put(id: string, body: Record<string, unknown>): Promise<[number, string]> {
    const res = await apiFetch(`/api/v1/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return [res.status, await res.text()];
  }

  it('accepts the stripped shape and refuses each field the gotchas name', async () => {
    const wf = await createWorkflowFixture({ withTrigger: true });
    const base = {
      name: wf.name,
      nodes: [SCHEDULE_NODE],
      connections: {},
      settings: { executionOrder: 'v1' },
    };

    // Positive control: exactly what stripForPublish() sends.
    expect((await put(wf.id, { ...base, staticData: null }))[0]).toBe(200);

    // Gotcha 1: extra top-level fields are rejected.
    const [junkStatus, junkBody] = await put(wf.id, { ...base, junkField: 1 });
    expect(junkStatus).toBe(400);
    expect(junkBody).toContain('junkField');
    expect(await put(wf.id, { ...base, id: wf.id })).toEqual([
      400,
      expect.stringContaining('request/body/id is read-only'),
    ]);

    // Gotcha 2: active is read-only.
    expect(await put(wf.id, { ...base, active: true })).toEqual([
      400,
      expect.stringContaining('request/body/active is read-only'),
    ]);

    // Gotcha 3 (corrected for #42): unknown settings keys are rejected…
    const [bogusStatus, bogusBody] = await put(wf.id, {
      ...base,
      settings: { executionOrder: 'v1', bogusKey: 1 },
    });
    expect(bogusStatus).toBe(400);
    expect(bogusBody).toContain('bogusKey');
    // …but n8n's own settings keys are accepted, so executionOrder-only is not required.
    expect(
      (
        await put(wf.id, { ...base, settings: { executionOrder: 'v1', timezone: 'Europe/Warsaw' } })
      )[0],
    ).toBe(200);
    // Every key in stripForPublish()'s allowlist is one n8n accepts – this is the list that
    // must move together with the pinned n8n version.
    const knownSettings = {
      saveExecutionProgress: true,
      saveManualExecutions: false,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'none',
      executionTimeout: 3600,
      errorWorkflow: 'err-wf-id',
      timezone: 'Europe/Warsaw',
      executionOrder: 'v1',
      binaryMode: 'separate',
      callerPolicy: 'workflowsFromSameOwner',
      callerIds: 'id-1,id-2',
      timeSavedMode: 'fixed',
      timeSavedPerExecution: 30,
      redactionPolicy: 'non-manual',
      availableInMCP: true,
      customTelemetryTags: [{ key: 'team', value: 'ops' }],
      credentialResolverId: 'resolver-1',
    };
    expect(await put(wf.id, { ...base, settings: knownSettings })).toEqual([
      200,
      expect.anything(),
    ]);

    // settings itself is required.
    const noSettings = { name: base.name, nodes: base.nodes, connections: base.connections };
    expect(await put(wf.id, noSettings)).toEqual([
      400,
      expect.stringContaining("must have required property 'settings'"),
    ]);
  });

  it('wf publish keeps a settings key n8n accepts (#42)', async () => {
    const wf = await createWorkflowFixture();
    const dir = mkdtempSync(join(tmpdir(), '8cli-settings-'));
    const file = join(dir, `${wf.id}_settings.json`);
    writeFileSync(
      file,
      JSON.stringify({
        id: wf.id,
        name: wf.name,
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1', timezone: 'Europe/Warsaw' },
      }),
    );
    expect((await run8cli(['wf', 'publish', '--file', file], apiEnv())).exitCode).toBe(0);
    const got = await run8cli(['wf', 'get', wf.id], apiEnv());
    expect(json<{ settings: Record<string, unknown> }>(got).settings.timezone).toBe(
      'Europe/Warsaw',
    );
  });
});
