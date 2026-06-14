// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { apiEnv, run8cli } from './setup/helpers.js';

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
  });
});
