// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { apiEnv, json, run8cli } from './setup/helpers.js';

// `auth verify` has a deliberate non-{error,code} shape: on an auth failure it
// prints {url,authenticated:false,error,statusCode} to STDOUT and exits 1 (so an
// agent can read the verdict as JSON). This locks both branches against the live
// container. Keychain-backed auth commands are covered in test/e2e-macos/.

describe('auth verify (network)', () => {
  it('reports authenticated:false with a 401 status for an invalid key', async () => {
    const r = await run8cli(['auth', 'verify'], apiEnv({ N8N_API_KEY: 'not-a-valid-key' }));
    expect(r.exitCode).toBe(1);
    const out = json<{ authenticated: boolean; statusCode: number }>(r);
    expect(out.authenticated).toBe(false);
    expect(out.statusCode).toBe(401);
  });

  it('confirms a valid key', async () => {
    const r = await run8cli(['auth', 'verify'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(json<{ authenticated: boolean }>(r).authenticated).toBe(true);
  });
});
