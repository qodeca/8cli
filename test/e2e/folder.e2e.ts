// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

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
