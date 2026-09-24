// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { stripForPublish } from '../src/commands/workflow.js';

// Regression coverage for issue #42: `wf publish` used to keep only
// `settings.executionOrder` and drop every other key, so a settings change in a saved
// workflow file never reached the server. The unit test drives the filter directly;
// the n8n side of the boundary (which keys it accepts) is locked by the raw-PUT case
// in test/e2e/workflow.e2e.ts.

// n8n 2.40.5 public-API `workflowSettingsWritePublicSchema` (@n8n/api-types), a
// `.strict()` schema. Every key here is accepted by PUT/POST /workflows/{id}; anything
// else is rejected with "Unrecognized key(s) in object: '<key>'".
const KNOWN_SETTINGS: Record<string, unknown> = {
  saveExecutionProgress: true,
  saveManualExecutions: false,
  saveDataErrorExecution: 'all',
  saveDataSuccessExecution: 'none',
  executionTimeout: 3600,
  errorWorkflow: 'err-wf-id',
  timezone: 'Europe/Warsaw',
  executionOrder: 'v1',
  binaryMode: 'separate',
  callerPolicy: 'workflowsFromSameOwner',
  callerIds: 'id-1,id-2',
  timeSavedMode: 'fixed',
  timeSavedPerExecution: 30,
  redactionPolicy: 'non-manual',
  availableInMCP: true,
  customTelemetryTags: [{ key: 'team', value: 'ops' }],
  credentialResolverId: 'resolver-1',
};

describe('stripForPublish settings filter (#42)', () => {
  it('keeps every settings key n8n accepts', () => {
    const out = stripForPublish({
      name: 'wf',
      nodes: [],
      connections: {},
      settings: { ...KNOWN_SETTINGS },
    });

    expect(out.settings).toEqual(KNOWN_SETTINGS);
  });

  it('drops an unknown settings key and keeps the known ones beside it', () => {
    const out = stripForPublish({
      name: 'wf',
      nodes: [],
      connections: {},
      settings: { executionOrder: 'v1', timezone: 'Europe/Warsaw', bogusKey: 1 },
    });

    expect(out.settings).toEqual({ executionOrder: 'v1', timezone: 'Europe/Warsaw' });
    expect(out.settings).not.toHaveProperty('bogusKey');
  });

  it('sends an empty settings object rather than omitting a required field', () => {
    // n8n requires `settings` on PUT/POST; a file whose settings hold only unknown
    // keys must still send the (now empty) object, not drop the field.
    const out = stripForPublish({ name: 'wf', nodes: [], connections: {}, settings: { bogus: 1 } });

    expect(out.settings).toEqual({});
  });

  it('leaves a workflow without a settings object without one', () => {
    const out = stripForPublish({ name: 'wf', nodes: [], connections: {} });

    expect(out).not.toHaveProperty('settings');
  });

  // Guard: passes with and without the #42 fix. Kept because it locks the other half of
  // the PUT contract (read-only / extra top-level fields) that the fix must not undo.
  it('still strips read-only and unknown top-level fields', () => {
    const out = stripForPublish({
      id: 'abc',
      active: true,
      name: 'wf',
      nodes: [],
      connections: {},
      junkField: 'x',
      settings: { executionOrder: 'v1' },
    });

    expect(out).toEqual({
      name: 'wf',
      nodes: [],
      connections: {},
      settings: { executionOrder: 'v1' },
    });
  });
});
