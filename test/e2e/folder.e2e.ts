// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  apiEnv,
  createWorkflowFixture,
  errorMessage,
  internalEnv,
  json,
  LICENSE_GATED,
  run8cli,
  uniqueName,
} from './setup/helpers.js';

// Folders use the internal (cookie-auth) API and are license-gated on a free
// Community container. These specs lock both the missing-credentials guard and
// the gated-error contract. `toFailWithCode` also asserts no raw stack trace
// leaks (regression-testing the fix that routes internal-API errors through
// {error,code} instead of an uncaught ApiRequestError).
//
// Login budget: every folder command logs in afresh (sync even before it checks
// --dir), and n8n allows 5 logins per minute; the 6th waits out a 60 s
// Retry-After (#47). This file makes 6 (tree, create, both syncs, two moves):
// the 6th, the unknown-workflow move, runs last and carries a 90 s timeout to
// wait out that Retry-After. Do not add more. `folder delete` is deferred for
// that reason. The `folder --dry` cases below make no request at all, so they
// spend none of the budget.

describe('folder credential guard', () => {
  it('requires email/password (internal API)', async () => {
    const r = await run8cli(['folder', 'tree'], apiEnv());
    expect(r).toFailWithCode('ERR_NO_CREDENTIALS');
  });
});

// #67: `folder move` (and create/delete) ignored `--dry` and performed the real
// change. A dry run is a preview built from the arguments: it sends no request,
// so it needs neither the license-gated folder list nor a reachable n8n, and
// these cases pass on free Community. The no-request proof is the unit test
// (test/folder-dry-run.test.ts); here the gated error that a real call would hit
// is asserted absent by the exit-0 + preview shape.
describe('folder --dry is a request-free preview', () => {
  it('move --dry previews the move without moving the workflow', async () => {
    // A real workflow, so the pre-fix code would have found it and PATCHed it.
    const wf = await createWorkflowFixture();
    const r = await run8cli(['--dry', 'folder', 'move', wf.name, '--to', '(root)'], internalEnv());
    expect(r.exitCode).toBe(0);
    expect(json<{ dryRun: boolean; moved: Record<string, unknown> }>(r)).toEqual({
      dryRun: true,
      moved: { workflowId: null, workflowName: wf.name, toFolder: '(root)' },
    });
  });

  it('create --dry previews the folder', async () => {
    const r = await run8cli(
      ['--dry', 'folder', 'create', 'e2e-dry-folder', '--parent', 'e2e-dry-parent'],
      internalEnv(),
    );
    expect(r.exitCode).toBe(0);
    expect(json(r)).toEqual({
      dryRun: true,
      id: null,
      name: 'e2e-dry-folder',
      parentFolder: 'e2e-dry-parent',
    });
  });

  it('delete --dry previews the deletion', async () => {
    const r = await run8cli(['--dry', 'folder', 'delete', 'e2e-dry-folder'], internalEnv());
    expect(r.exitCode).toBe(0);
    expect(json(r)).toEqual({
      dryRun: true,
      deleted: { id: null, name: 'e2e-dry-folder' },
    });
  });
});

describe('folder (license-gated on free n8n)', () => {
  it('tree returns a structured error, not a raw stack trace', async () => {
    const r = await run8cli(['folder', 'tree'], internalEnv());
    expect(r).toFailWithCode('ERR_FOLDER_TREE');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('create returns a structured error', async () => {
    const r = await run8cli(['folder', 'create', uniqueName('folder')], internalEnv());
    expect(r).toFailWithCode('ERR_FOLDER_CREATE');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });
});

describe('folder sync / move', () => {
  // sync checks the local dir BEFORE any (gated) folder call, so this branch is
  // reachable on free n8n; sync's dry-run happy path needs folders (licensed) and
  // is deferred (see test/e2e/COVERAGE.md).
  it('sync errors when the workflow dir is missing', async () => {
    const r = await run8cli(['folder', 'sync', '--dir', '/no/such/dir-8cli'], internalEnv());
    expect(r).toFailWithCode('ERR_DIR_NOT_FOUND');
  });

  it('sync over an existing dir reaches the gated-folder error', async () => {
    const dir = mkdtempSync(join(tmpdir(), '8cli-sync-'));
    const r = await run8cli(['folder', 'sync', '--dir', dir], internalEnv());
    expect(r).toFailWithCode('ERR_FOLDER_SYNC');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  // #53: the root is n8n's PROJECT_ROOT sentinel ("0"), not null. A root move
  // skips the (gated) folder list and PATCHes the workflow, so on free
  // Community it succeeds instead of failing n8n's request schema with
  // "Expected string, received null". The fixture already sits at root, so
  // this proves n8n accepts "0", not that a workflow leaves a folder; moving
  // out of a real folder needs a licensed instance and is unverified.
  it('move to (root) sends the root sentinel and succeeds', async () => {
    const wf = await createWorkflowFixture();
    const r = await run8cli(['folder', 'move', wf.name, '--to', '(root)'], internalEnv());
    expect(r.exitCode).toBe(0);
    expect(
      json<{ moved: { workflowId: string; workflowName: string; toFolder: string } }>(r),
    ).toEqual({
      moved: { workflowId: wf.id, workflowName: wf.name, toFolder: '(root)' },
    });
  });

  // The 6th login in this file: n8n's 5-per-minute limit makes it wait out a
  // 60 s Retry-After (#47), hence the longer timeout.
  it('move returns a structured error for an unknown workflow', { timeout: 90_000 }, async () => {
    const r = await run8cli(['folder', 'move', uniqueName('nowf'), '--to', 'x'], internalEnv());
    expect(r.exitCode).toBe(1);
    // ERR_WORKFLOW_NOT_FOUND if the internal workflow list is reachable, else
    // ERR_FOLDER_MOVE if it is gated – both are the structured-error contract.
    expect(['ERR_WORKFLOW_NOT_FOUND', 'ERR_FOLDER_MOVE']).toContain(
      (JSON.parse(r.stderr) as { code: string }).code,
    );
  });
});
