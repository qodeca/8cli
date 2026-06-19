// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerUserCommands(program: Command): void {
  const user = program.command('user').description('Manage users');

  // ── user list ────────────────────────────────────────────────────────────

  user
    .command('list')
    .description('List all users')
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
        const users = await client.listUsers();

        output(
          users.map(({ id, email, role }) => ({ id, email, role })),
          { table: config.table },
        );
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_USER_LIST');
      }
    });

  // ── user get ─────────────────────────────────────────────────────────────

  user
    .command('get <id>')
    .description('Get a user by ID')
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
        const foundUser = await client.getUser(id);

        outputJson({
          id: foundUser.id,
          email: foundUser.email,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          role: foundUser.role,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_USER_GET');
      }
    });
}
