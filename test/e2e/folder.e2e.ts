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
// that reason.

describe('folder credential guard', () => {
  it('requires email/password (internal API)', async () => {
    const r = await run8cli(['folder', 'tree'], apiEnv());
    expect(r).toFailWithCode('ERR_NO_CREDENTIALS');
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
  // reachable on free n8n; the dry-run happy path needs folders (licensed) and
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
