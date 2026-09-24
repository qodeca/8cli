// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Demo data for the README GIF (scripts/demo/record.sh). Creates a few inactive workflows in
// the local n8n, by name, so re-running it changes nothing. Reads N8N_URL and N8N_API_KEY from
// the environment – record.sh loads them from the local n8n env file. Prints one JSON object.

import { PublicApiClient } from '../../src/client/public-api.js';
import type { Workflow } from '../../src/types.js';

const DEMO_WORKFLOWS = [
  'Daily sales report',
  'New lead to Slack',
  'Sync CRM contacts',
  'Invoice reminder',
];

function demoWorkflow(name: string): Partial<Workflow> {
  return {
    name,
    nodes: [
      {
        name: 'Schedule trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [0, 0],
        parameters: { rule: { interval: [{ field: 'days' }] } },
      },
      {
        name: 'Do nothing',
        type: 'n8n-nodes-base.noOp',
        typeVersion: 1,
        position: [220, 0],
        parameters: {},
      },
    ],
    connections: {
      'Schedule trigger': { main: [[{ node: 'Do nothing', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

async function main(): Promise<void> {
  const url = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!url || !apiKey) {
    throw new Error('N8N_URL and N8N_API_KEY must be set (run through scripts/demo/record.sh)');
  }
  const client = new PublicApiClient(url, apiKey);
  const existing = new Set((await client.listWorkflows()).map((w) => w.name));
  const created: string[] = [];
  for (const name of DEMO_WORKFLOWS) {
    if (existing.has(name)) continue;
    await client.createWorkflow(demoWorkflow(name));
    created.push(name);
  }
  process.stdout.write(`${JSON.stringify({ command: 'seed-demo', created })}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${JSON.stringify({ error: message, code: 'ERR_DEMO_SEED' })}\n`);
  process.exit(1);
});
