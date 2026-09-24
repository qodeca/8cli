// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import {
  apiEnv,
  createWebhookWorkflowFixture,
  json,
  run8cli,
  waitFor,
  type WebhookWorkflowFixture,
} from './setup/helpers.js';

interface ExecItem {
  id: string;
  workflowId: string;
  status: string;
  mode: string;
}

/**
 * Start `count` real executions through the fixture's webhook, return their ids.
 * n8n registers a production webhook shortly after activation, so a 404 is
 * retried until it answers; a 404 starts no execution, so the count stays exact.
 */
async function runWebhook(wf: WebhookWorkflowFixture, count: number): Promise<string[]> {
  for (let i = 0; i < count; i += 1) {
    await waitFor(`webhook ${wf.webhookUrl}`, async () => {
      const res = await fetch(wf.webhookUrl);
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`webhook call failed: ${res.status}`);
      return true;
    });
  }
  return waitFor(`${count} executions of ${wf.id}`, async () => {
    const r = await run8cli(['exec', 'list', '--workflow', wf.id, '--limit', '50'], apiEnv());
    const items = json<ExecItem[]>(r) ?? [];
    return items.length >= count ? items.map((e) => e.id) : undefined;
  });
}

describe('exec list', () => {
  it('returns a JSON array', async () => {
    const r = await run8cli(['exec', 'list'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
  });

  it('accepts --workflow and --limit filters', async () => {
    const r = await run8cli(['exec', 'list', '--workflow', '123', '--limit', '5'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
  });
});

describe('exec get / delete errors', () => {
  it('reports a structured error for a missing execution', async () => {
    const r = await run8cli(['exec', 'get', '999999'], apiEnv());
    expect(r).toFailWithCode('ERR_HTTP_404');
  });

  it('accepts --data without crashing on a missing execution', async () => {
    const r = await run8cli(['exec', 'get', '999999', '--data'], apiEnv());
    expect(r).toFailWithCode('ERR_HTTP_404');
  });

  it('reports a structured error deleting a missing execution', async () => {
    const r = await run8cli(['exec', 'delete', '999999'], apiEnv());
    expect(r).toFailWithCode('ERR_HTTP_404');
  });
});

// Real executions, started through a production webhook (n8n 2.40.5 validation, #32).
describe('exec against real executions', () => {
  it('list filters by workflow, status and limit with real semantics', async () => {
    const wf = await createWebhookWorkflowFixture();
    const other = await createWebhookWorkflowFixture();
    await runWebhook(wf, 2);
    await runWebhook(other, 1);

    const mine = json<ExecItem[]>(
      await run8cli(['exec', 'list', '--workflow', wf.id, '--limit', '50'], apiEnv()),
    );
    expect(mine).toHaveLength(2);
    expect(mine.every((e) => e.workflowId === wf.id && e.mode === 'webhook')).toBe(true);

    // --status: every run succeeded, so success keeps them and error drops them.
    const ok = json<ExecItem[]>(
      await run8cli(['exec', 'list', '--workflow', wf.id, '--status', 'success'], apiEnv()),
    );
    expect(ok.map((e) => e.id).sort()).toEqual(mine.map((e) => e.id).sort());
    const failed = await run8cli(
      ['exec', 'list', '--workflow', wf.id, '--status', 'error'],
      apiEnv(),
    );
    expect(failed.exitCode).toBe(0);
    expect(failed.json).toEqual([]);

    // --limit is honoured as a single page.
    const one = json<ExecItem[]>(
      await run8cli(['exec', 'list', '--workflow', wf.id, '--limit', '1'], apiEnv()),
    );
    expect(one).toHaveLength(1);
  });

  it('get returns node data only with --data (includeData gotcha), delete removes the run', async () => {
    const wf = await createWebhookWorkflowFixture();
    const [id] = await runWebhook(wf, 1);

    const bare = await run8cli(['exec', 'get', id], apiEnv());
    expect(bare.exitCode).toBe(0);
    expect(bare.json).toMatchObject({ id, workflowId: wf.id, status: 'success' });
    expect(bare.json).not.toHaveProperty('data');

    const full = await run8cli(['exec', 'get', id, '--data'], apiEnv());
    expect(full.exitCode).toBe(0);
    const runData = json<{ data: { resultData: { runData: Record<string, unknown> } } }>(full).data
      .resultData.runData;
    expect(Object.keys(runData)).toEqual(['Webhook']);

    const del = await run8cli(['exec', 'delete', id], apiEnv());
    expect(del.exitCode).toBe(0);
    expect(del.json).toEqual({ id, deleted: true });
    expect(await run8cli(['exec', 'get', id], apiEnv())).toFailWithCode('ERR_HTTP_404');
  });

  it('get refuses a non-numeric id with a structured 400', async () => {
    const r = await run8cli(['exec', 'get', 'not-a-number'], apiEnv());
    expect(r).toFailWithCode('ERR_HTTP_400');
  });
});
