// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { outputError, outputJson } from '../formatters/index.js';

export function registerAuditCommands(program: Command): void {
  const audit = program.command('audit').description('Security audit');

  audit
    .command('run')
    .description('Run security audit and output the full report')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('No n8n URL or API key configured', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const result = await client.generateAudit();
        outputJson(result);
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUDIT');
      }
    });
}
