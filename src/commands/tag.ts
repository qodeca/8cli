// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerTagCommands(program: Command): void {
  const tag = program.command('tag').description('Manage tags');

  // ── tag list ─────────────────────────────────────────────────────────────

  tag
    .command('list')
    .description('List all tags')
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
        const tags = await client.listTags();

        output(
          tags.map(({ id, name }) => ({ id, name })),
          { table: config.table },
        );
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_TAG_LIST');
      }
    });

  // ── tag create ───────────────────────────────────────────────────────────

  tag
    .command('create <name>')
    .description('Create a new tag')
    .action(async (name: string) => {
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
        const created = await client.createTag(name);

        outputJson({ id: created.id, name: created.name });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_TAG_CREATE');
      }
    });

  // ── tag update ───────────────────────────────────────────────────────────

  tag
    .command('update <id>')
    .description('Update a tag name')
    .requiredOption('--name <name>', 'New tag name')
    .action(async (id: string, opts: { name: string }) => {
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
        const updated = await client.updateTag(id, opts.name);

        outputJson({ id: updated.id, name: updated.name });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_TAG_UPDATE');
      }
    });

  // ── tag delete ───────────────────────────────────────────────────────────

  tag
    .command('delete <id>')
    .description('Delete a tag')
    .action(async (id: string) => {
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
        await client.deleteTag(id);

        outputJson({ id, deleted: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_TAG_DELETE');
      }
    });
}
