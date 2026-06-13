// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerCredentialCommands(program: Command): void {
  const cred = program
    .command('credential')
    .alias('cred')
    .description('Manage credentials');

  // ── list ────────────────────────────────────────────────────────────────

  cred
    .command('list')
    .description('List all credentials')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('Missing url or apiKey – run "8cli auth login" or pass --url and --api-key', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const creds = await client.listCredentials();
        output(creds, { table: config.table });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_CRED_LIST');
      }
    });

  // ── delete ──────────────────────────────────────────────────────────────

  cred
    .command('delete <id>')
    .description('Delete a credential by ID')
    .action(async (id: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('Missing url or apiKey – run "8cli auth login" or pass --url and --api-key', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        await client.deleteCredential(id);
        outputJson({ id, deleted: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_CRED_DELETE');
      }
    });

  // ── transfer ────────────────────────────────────────────────────────────

  cred
    .command('transfer <id>')
    .description('Transfer a credential to another project')
    .requiredOption('--to <projectId>', 'Destination project ID')
    .action(async (id: string, opts: { to: string }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError('Missing url or apiKey – run "8cli auth login" or pass --url and --api-key', 'ERR_NO_CONFIG');
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        await client.transferCredential(id, opts.to);
        outputJson({ id, projectId: opts.to });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_CRED_TRANSFER');
      }
    });
}
