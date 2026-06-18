// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { outputError, outputJson } from '../formatters/index.js';

export function registerSourceControlCommands(program: Command): void {
  const sc = program.command('source-control').alias('sc').description('Source control operations');

  sc.command('status')
    .description('Show source control status')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('No n8n URL or API key configured', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const result = await client.getSourceControlStatus();
        outputJson(result);
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_SOURCE_CONTROL');
      }
    });

  sc.command('pull')
    .description('Pull from source control')
    .option('--force', 'Force pull, overwriting local changes')
    .action(async (opts) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('No n8n URL or API key configured', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const result = await client.pullFromSourceControl(opts.force ?? false);
        outputJson(result);
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_SOURCE_CONTROL');
      }
    });

  sc.command('push')
    .description('Push to source control')
    .option('--force', 'Force push, overwriting remote changes')
    .action(async () => {
      outputError(
        'Push is not supported via the n8n public API – use the n8n UI or internal API instead',
        'ERR_NOT_SUPPORTED',
      );
    });
}
