// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { apiEnv, run8cli } from './setup/helpers.js';

// Variables are a license-gated feature; on a free Community container every
// variable command surfaces n8n's license error through the structured
// {error,code} contract. These specs lock that gated-error contract.

describe('variable (license-gated on free n8n)', () => {
  it('list returns a structured license error', async () => {
    const r = await run8cli(['var', 'list'], apiEnv());
    expect(r).toFailWithCode('ERR_VARIABLE_LIST');
    expect((JSON.parse(r.stderr) as { error: string }).error).toMatch(/license/i);
  });

  it('set returns a structured license error', async () => {
    const r = await run8cli(['var', 'set', 'k', 'v'], apiEnv());
    expect(r).toFailWithCode('ERR_VARIABLE_SET');
  });

  it('delete returns a structured license error', async () => {
    const r = await run8cli(['var', 'delete', 'k'], apiEnv());
    expect(r).toFailWithCode('ERR_VARIABLE_DELETE');
  });
});
