// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../src/client/base.js';
import type { Workflow } from '../src/types.js';
import {
  deleteAfterUnpublish,
  deleteWorkflow,
  withDeleteHint,
  type WorkflowDeleteClient,
} from '../src/commands/workflow.js';

// Regression coverage for issue #43: n8n 2.40.5 refuses to delete a published (active)
// workflow, and it unpublishes asynchronously, so a DELETE issued straight after an
// unpublish is refused too – with a 409 "still being unpublished", or with a bare 500.
// `wf delete --force` must unpublish published workflows and then wait that transient
// state out; it must delete unpublished workflows directly.
//
// The failing run this locks (recorded in the task evidence): with the naive
// `deactivateWorkflow()` + `deleteWorkflow()` sequence, the "waits out the 409" case below
// fails on `expect(deleteWorkflow).toHaveBeenCalledTimes(2)` – the second call never
// happens because the first refusal is rethrown. The live 2.40.5 behaviour is locked e2e by
// test/e2e/workflow.e2e.ts ("deletes a published workflow in one step with --force").

const STILL_UNPUBLISHING =
  'Workflow is still being unpublished. Please try again in a few moments.';

function workflow(id: string, active: boolean): Workflow {
  return {
    id,
    name: 'wf',
    active,
    createdAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
  };
}

function apiError(statusCode: number, message: string): ApiRequestError {
  return new ApiRequestError({ message, statusCode, code: `ERR_HTTP_${statusCode}` });
}

function makeClient() {
  const getWorkflow = vi.fn<(id: string) => Promise<Workflow>>(async (id) => workflow(id, false));
  const deactivateWorkflow = vi.fn<(id: string) => Promise<Workflow>>(async (id) =>
    workflow(id, false),
  );
  const deleteWorkflow = vi.fn<(id: string) => Promise<Workflow>>(async (id) =>
    workflow(id, false),
  );
  const client: WorkflowDeleteClient = { getWorkflow, deactivateWorkflow, deleteWorkflow };
  return { client, getWorkflow, deactivateWorkflow, deleteWorkflow };
}

describe('wf delete without --force (#43)', () => {
  it('does not unpublish and keeps n8n output shape of a plain delete', async () => {
    const { client, deactivateWorkflow, deleteWorkflow: del } = makeClient();

    await expect(deleteWorkflow(client, 'wf1')).resolves.toEqual({ id: 'wf1', deleted: true });

    expect(deactivateWorkflow).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith('wf1');
  });
});

describe('wf delete --force (#43)', () => {
  it('deletes an unpublished workflow without unpublishing', async () => {
    const { client, getWorkflow, deactivateWorkflow, deleteWorkflow: del } = makeClient();

    await expect(deleteWorkflow(client, 'wf1', { force: true })).resolves.toEqual({
      id: 'wf1',
      deleted: true,
    });
    expect(getWorkflow).toHaveBeenCalledOnce();
    expect(deactivateWorkflow).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledOnce();
    expect(del).toHaveBeenCalledWith('wf1');
  });

  it('unpublishes a published workflow before deleting', async () => {
    const order: string[] = [];
    const { client, getWorkflow, deactivateWorkflow, deleteWorkflow: del } = makeClient();
    getWorkflow.mockImplementation(async (id) => {
      order.push('get');
      return workflow(id, true);
    });
    deactivateWorkflow.mockImplementation(async (id) => {
      order.push('unpublish');
      return workflow(id, false);
    });
    del.mockImplementation(async (id) => {
      order.push('delete');
      return workflow(id, false);
    });

    await expect(deleteWorkflow(client, 'wf1', { force: true })).resolves.toEqual({
      id: 'wf1',
      deleted: true,
    });
    expect(order).toEqual(['get', 'unpublish', 'delete']);
  });

  it('does not delete when the unpublish fails', async () => {
    const { client, getWorkflow, deactivateWorkflow, deleteWorkflow: del } = makeClient();
    getWorkflow.mockResolvedValue(workflow('wf1', true));
    deactivateWorkflow.mockRejectedValue(apiError(403, 'Forbidden'));

    await expect(deleteWorkflow(client, 'wf1', { force: true })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });
    expect(deactivateWorkflow).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
  });

  // The red-without-fix case: a naive unpublish-then-delete rethrows the first 409, so the
  // retry (and the delete) never happen.
  it('waits out the 409 n8n 2.40 leaves while the unpublish settles', async () => {
    const { client, getWorkflow, deleteWorkflow: del } = makeClient();
    getWorkflow.mockResolvedValue(workflow('wf1', true));
    del.mockRejectedValueOnce(apiError(409, STILL_UNPUBLISHING));

    await expect(deleteWorkflow(client, 'wf1', { force: true })).resolves.toEqual({
      id: 'wf1',
      deleted: true,
    });
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('also waits out the bare 500 the same race produces', async () => {
    const { client, getWorkflow, deleteWorkflow: del } = makeClient();
    getWorkflow.mockResolvedValue(workflow('wf1', true));
    del.mockRejectedValueOnce(apiError(500, 'Internal server error'));

    await expect(deleteWorkflow(client, 'wf1', { force: true })).resolves.toEqual({
      id: 'wf1',
      deleted: true,
    });
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('keeps the delete error for a missing workflow', async () => {
    const { client, getWorkflow, deactivateWorkflow, deleteWorkflow: del } = makeClient();
    getWorkflow.mockRejectedValue(apiError(404, 'Not Found'));
    del.mockRejectedValue(apiError(404, 'Not Found'));

    await expect(deleteWorkflow(client, 'missing', { force: true })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Not Found',
    });
    expect(deactivateWorkflow).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledOnce();
  });

  it('gives up when the settling state never clears and surfaces the refusal', async () => {
    const { client, deleteWorkflow: del } = makeClient();
    del.mockRejectedValue(apiError(409, STILL_UNPUBLISHING));

    await expect(
      deleteAfterUnpublish(client, 'wf1', { timeoutMs: 20, pollMs: 1 }),
    ).rejects.toMatchObject({ statusCode: 409, message: STILL_UNPUBLISHING });
    expect(del.mock.calls.length).toBeGreaterThan(1);
  });

  // Guard: passes with and without the #43 fix. It locks the boundary the retry must not
  // cross – a real refusal is not the settling race, so it surfaces at once, unretried.
  it('does not retry a real refusal (403)', async () => {
    const { client, deleteWorkflow: del } = makeClient();
    del.mockRejectedValue(apiError(403, 'Forbidden'));

    await expect(
      deleteAfterUnpublish(client, 'wf1', { timeoutMs: 20, pollMs: 1 }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('does not retry a settled 409 with a different message', async () => {
    const { client, deleteWorkflow: del } = makeClient();
    del.mockRejectedValue(apiError(409, 'Cannot delete a published workflow'));

    await expect(
      deleteAfterUnpublish(client, 'wf1', { timeoutMs: 20, pollMs: 1 }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(del).toHaveBeenCalledTimes(1);
  });
});

describe('wf delete --dry (#43)', () => {
  // The preview follows the flags: it says what this run would do, not what a delete needs.
  it.each([
    { force: false, active: false, wouldUnpublish: false, wouldBeRefused: false },
    { force: false, active: true, wouldUnpublish: false, wouldBeRefused: true },
    { force: true, active: false, wouldUnpublish: false, wouldBeRefused: false },
    { force: true, active: true, wouldUnpublish: true, wouldBeRefused: false },
  ])(
    'force=$force, active=$active → wouldUnpublish=$wouldUnpublish, wouldBeRefused=$wouldBeRefused, no write request',
    async ({ force, active, wouldUnpublish, wouldBeRefused }) => {
      const { client, getWorkflow, deactivateWorkflow, deleteWorkflow: del } = makeClient();
      getWorkflow.mockResolvedValue(workflow('wf1', active));

      await expect(deleteWorkflow(client, 'wf1', { force, dry: true })).resolves.toEqual({
        dryRun: true,
        id: 'wf1',
        deleted: false,
        wouldUnpublish,
        wouldBeRefused,
      });
      expect(deactivateWorkflow).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    },
  );

  // Guard: passes with and without the #43 fix. Before the dry run read the workflow it
  // never failed on a missing one, so `wf delete <missing> --dry` exited 0; that stays true.
  it.each([false, true])(
    'reports a plain delete when the workflow does not exist (force=%s)',
    async (force) => {
      const { client, getWorkflow } = makeClient();
      getWorkflow.mockRejectedValue(apiError(404, 'Not Found'));

      await expect(deleteWorkflow(client, 'missing', { force, dry: true })).resolves.toEqual({
        dryRun: true,
        id: 'missing',
        deleted: false,
        wouldUnpublish: false,
        wouldBeRefused: false,
      });
    },
  );

  it('surfaces a read error that is not a 404', async () => {
    const { client, getWorkflow } = makeClient();
    getWorkflow.mockRejectedValue(apiError(500, 'Internal server error'));

    await expect(deleteWorkflow(client, 'wf1', { dry: true })).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe('withDeleteHint (#43)', () => {
  it("appends the way out to n8n's published-workflow refusal", () => {
    const hinted = withDeleteHint(
      'Cannot delete a published workflow. Unpublish it before deleting.',
      'H1lrBYWCZUIi7zgE',
    );

    expect(hinted).toContain('Cannot delete a published workflow');
    // The real id, so the command can be copied as is.
    expect(hinted).toContain('8cli wf deactivate H1lrBYWCZUIi7zgE');
    expect(hinted).not.toContain('<id>');
  });

  it('leaves an unrelated error unchanged', () => {
    expect(withDeleteHint('Not Found', 'wf1')).toBe('Not Found');
  });
});
