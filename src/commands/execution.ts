// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { ApiRequestError } from '../client/base.js';
import { output, outputError, outputJson } from '../formatters/index.js';
import type { Execution, PaginatedResponse } from '../types.js';

export function registerExecutionCommands(program: Command): void {
  const exec = program
    .command('execution')
    .alias('exec')
    .description('Manage executions');

  // ── execution list ──────────────────────────────────────────────────────

  exec
    .command('list')
    .description('List executions')
    .option('--workflow <id>', 'Filter by workflow ID')
    .option('--status <status>', 'Filter by status (success, error, waiting)')
    .option('--limit <n>', 'Limit number of results (default: 20)', '20')
    .action(async (opts) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured. Use --url flag or N8N_URL env var.', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured. Use --api-key flag, N8N_API_KEY env var, or `auth login`.', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        const params: Record<string, string | number | boolean | undefined> = {};
        if (opts.workflow) params.workflowId = opts.workflow;
        if (opts.status) params.status = opts.status;

        const limit = parseInt(opts.limit, 10);
        params.limit = limit;

        // Use a single request with limit instead of paginateAll to respect the limit
        const response = await client.get<PaginatedResponse<Execution>>('/api/v1/executions', { params });
        const executions = response.data;

        output(executions, {
          table: config.table,
          columns: [
            { key: 'id', header: 'ID', width: 8 },
            { key: 'workflowId', header: 'Workflow', width: 10 },
            { key: 'status', header: 'Status', width: 10 },
            { key: 'startedAt', header: 'Started at', width: 24 },
            { key: 'stoppedAt', header: 'Stopped at', width: 24 },
          ],
        });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_EXECUTION_LIST',
        );
      }
    });

  // ── execution get ───────────────────────────────────────────────────────

  exec
    .command('get <id>')
    .description('Get execution details')
    .option('--data', 'Include full node execution data')
    .action(async (id: string, opts) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured. Use --url flag or N8N_URL env var.', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured. Use --api-key flag, N8N_API_KEY env var, or `auth login`.', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        const params: Record<string, string | number | boolean | undefined> = {};
        if (opts.data) params.includeData = true;

        const execution = await client.getExecution(id, params);
        outputJson(execution);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_EXECUTION_GET',
        );
      }
    });

  // ── execution delete ────────────────────────────────────────────────────

  exec
    .command('delete <id>')
    .description('Delete an execution')
    .action(async (id: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured. Use --url flag or N8N_URL env var.', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured. Use --api-key flag, N8N_API_KEY env var, or `auth login`.', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        await client.deleteExecution(id);
        outputJson({ id, deleted: true });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_EXECUTION_DELETE',
        );
      }
    });
}
