// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { apiEnv, internalEnv, run8cli, uniqueName } from './setup/helpers.js';

// Folders use the internal (cookie-auth) API and are license-gated on a free
// Community container. These specs lock both the missing-credentials guard and
// the gated-error contract. `toFailWithCode` also asserts no raw stack trace
// leaks (regression-testing the fix that routes internal-API errors through
// {error,code} instead of an uncaught ApiRequestError).

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
  });

  it('create returns a structured error', async () => {
    const r = await run8cli(['folder', 'create', uniqueName('folder')], internalEnv());
    expect(r).toFailWithCode('ERR_FOLDER_CREATE');
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
  });

  it('move returns a structured error for an unknown workflow', async () => {
    const r = await run8cli(['folder', 'move', uniqueName('nowf'), '--to', 'x'], internalEnv());
    expect(r.exitCode).toBe(1);
    // ERR_WORKFLOW_NOT_FOUND if the internal workflow list is reachable, else
    // ERR_FOLDER_MOVE if it is gated — both are the structured-error contract.
    expect(['ERR_WORKFLOW_NOT_FOUND', 'ERR_FOLDER_MOVE']).toContain(
      (JSON.parse(r.stderr) as { code: string }).code,
    );
  });
});
