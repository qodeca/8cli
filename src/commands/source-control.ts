// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { outputError, outputJson } from '../formatters/index.js';

/** Directions n8n's GET /source-control/status accepts. */
type SourceControlDirection = 'pull' | 'push';

/**
 * Validate the --direction value before any request is made. n8n requires the
 * query param and only accepts "pull" or "push"; anything else is a usage
 * error, not an API error.
 */
function parseDirection(value: string): SourceControlDirection {
  if (value === 'pull' || value === 'push') return value;
  outputError(`Invalid --direction "${value}" – expected "pull" or "push"`, 'ERR_USAGE');
}

export function registerSourceControlCommands(program: Command): void {
  const sc = program.command('source-control').alias('sc').description('Source control operations');

  sc.command('status')
    .description('Show source control status')
    .option('--direction <direction>', 'Direction to preview: "pull" or "push"', 'pull')
    .action(async (opts: { direction: string }) => {
      const direction = parseDirection(opts.direction);
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('No n8n URL or API key configured', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const result = await client.getSourceControlStatus(direction);
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
    .description('Push to source control (not supported via the n8n public API)')
    .option('--force', 'Force push, overwriting remote changes')
    .action(async () => {
      outputError(
        'Push is not supported via the n8n public API – use the n8n UI or internal API instead',
        'ERR_NOT_SUPPORTED',
      );
    });
}
