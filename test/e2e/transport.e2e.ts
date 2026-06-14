// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, expect, it } from 'vitest';
import { run8cli } from './setup/helpers.js';

// Transport failure: point the CLI at a closed loopback port and assert it
// surfaces the stable contract (exit 1 + structured {error,code}) rather than a
// raw fetch exception. The OS-level message is intentionally not asserted.

describe('transport failure', () => {
  it('maps a connection refusal to a structured error', async () => {
    const r = await run8cli(['wf', 'list'], {
      N8N_URL: 'http://127.0.0.1:1',
      N8N_API_KEY: 'irrelevant',
    });
    expect(r).toFailWithCode('ERR_WORKFLOW_LIST');
  });
});
