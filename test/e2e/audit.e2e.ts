// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { apiEnv, json, run8cli } from './setup/helpers.js';

describe('audit run', () => {
  it('returns an audit report keyed by risk categories', async () => {
    const r = await run8cli(['audit', 'run'], apiEnv());
    expect(r.exitCode).toBe(0);
    const report = json<Record<string, unknown>>(r);
    expect(report).toBeTypeOf('object');
    expect(report).not.toBeNull();
    expect(Array.isArray(report)).toBe(false);
    // n8n keys each section "<Area> Risk Report"; an empty report is also valid.
    for (const key of Object.keys(report)) {
      expect(key).toMatch(/Risk Report/);
    }
  });
});
