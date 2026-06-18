// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { apiEnv, run8cli } from './setup/helpers.js';

// A fresh container has no executions; happy-path execution data would require
// triggering a workflow run (out of scope for the free public API). These specs
// cover the list and the structured error paths, which is the reachable surface.

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
