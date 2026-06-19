// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerVariableCommands(program: Command): void {
  const variable = program.command('variable').alias('var').description('Manage variables');

  // ── variable list ────────────────────────────────────────────────────────

  variable
    .command('list')
    .description('List all variables')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url || !config.apiKey) {
          outputError(
            'No n8n URL or API key configured. Use --url/--api-key flags, env vars, or `auth login`.',
            'ERR_NO_CONFIG',
          );
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const variables = await client.listVariables();

        output(
          variables.map(({ id, key, value }) => ({ id, key, value })),
          { table: config.table },
        );
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_VARIABLE_LIST');
      }
    });

  // ── variable set ─────────────────────────────────────────────────────────

  variable
    .command('set <key> <value>')
    .description('Create or update a variable (deletes existing if found, then creates)')
    .action(async (key: string, value: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url || !config.apiKey) {
          outputError(
            'No n8n URL or API key configured. Use --url/--api-key flags, env vars, or `auth login`.',
            'ERR_NO_CONFIG',
          );
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        // Check if variable with this key already exists
        const existing = await client.listVariables();
        const found = existing.find((v) => v.key === key);

        if (found) {
          await client.deleteVariable(found.id);
        }

        const created = await client.createVariable({ key, value });

        outputJson({ id: created.id, key: created.key, value: created.value });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_VARIABLE_SET');
      }
    });

  // ── variable delete ──────────────────────────────────────────────────────

  variable
    .command('delete <key>')
    .description('Delete a variable by key')
    .action(async (key: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url || !config.apiKey) {
          outputError(
            'No n8n URL or API key configured. Use --url/--api-key flags, env vars, or `auth login`.',
            'ERR_NO_CONFIG',
          );
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        // Find variable by key
        const variables = await client.listVariables();
        const found = variables.find((v) => v.key === key);

        if (!found) {
          outputError(`Variable with key "${key}" not found.`, 'ERR_VARIABLE_NOT_FOUND');
        }

        await client.deleteVariable(found!.id);

        outputJson({ key, deleted: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_VARIABLE_DELETE');
      }
    });
}
