// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { apiEnv, errorMessage, LICENSE_GATED, run8cli } from './setup/helpers.js';

describe('source-control', () => {
  it('push reports the unsupported-operation contract (no network needed)', async () => {
    const r = await run8cli(['sc', 'push'], apiEnv());
    expect(r).toFailWithCode('ERR_NOT_SUPPORTED');
  });

  it('status returns a structured error on a free container', async () => {
    const r = await run8cli(['sc', 'status'], apiEnv());
    expect(r).toFailWithCode('ERR_SOURCE_CONTROL');
  });

  it('pull returns a structured error on a free container', async () => {
    const r = await run8cli(['sc', 'pull'], apiEnv());
    expect(r).toFailWithCode('ERR_SOURCE_CONTROL');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('pull --force returns a structured error on a free container', async () => {
    const r = await run8cli(['sc', 'pull', '--force'], apiEnv());
    expect(r).toFailWithCode('ERR_SOURCE_CONTROL');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('status reaches the license gate, not a missing route (#39)', async () => {
    const r = await run8cli(['sc', 'status'], apiEnv());
    expect(r).toFailWithCode('ERR_SOURCE_CONTROL');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });
});
