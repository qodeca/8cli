// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { ApiRequestError } from '../client/base.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerDataTableCommands(program: Command): void {
  const dt = program
    .command('datatable')
    .alias('dt')
    .description('Manage data tables');

  // ── datatable list ──────────────────────────────────────────────────────

  dt
    .command('list')
    .description('List all data tables')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const tables = await client.listDataTables();

        output(tables, {
          table: config.table,
          columns: [
            { key: 'id', header: 'ID', width: 20 },
            { key: 'name', header: 'Name', width: 30 },
            { key: 'columns', header: 'Columns', formatter: (v) => {
              const cols = v as Array<{ name: string }>;
              return cols.map(c => c.name).join(', ');
            }},
          ],
        });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_LIST',
        );
      }
    });

  // ── datatable get <id> ──────────────────────────────────────────────────

  dt
    .command('get <id>')
    .description('Get data table details')
    .action(async (id: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const table = await client.getDataTable(id);

        outputJson(table);
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_GET',
        );
      }
    });

  // ── datatable rows <id> ─────────────────────────────────────────────────

  dt
    .command('rows <id>')
    .description('List rows of a data table')
    .option('--limit <n>', 'Maximum number of rows to return', '100')
    .action(async (id: string, opts: { limit: string }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const limit = parseInt(opts.limit, 10);
        const rows = await client.listDataTableRows(id, { limit });

        output(rows, { table: config.table });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_ROWS',
        );
      }
    });

  // ── datatable create ────────────────────────────────────────────────────

  dt
    .command('create')
    .description('Create a new data table')
    .requiredOption('--name <name>', 'Table name')
    .requiredOption('--columns <json>', 'Column definitions as JSON array, e.g. \'[{"name":"col1","type":"string"}]\'')
    .action(async (opts: { name: string; columns: string }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        let columns: Array<{ name: string; type: string }>;
        try {
          columns = JSON.parse(opts.columns);
        } catch {
          outputError('Invalid JSON for --columns', 'ERR_INVALID_JSON');
        }

        if (config.dry) {
          outputJson({ dry: true, action: 'create', name: opts.name, columns: columns! });
          return;
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const table = await client.createDataTable({ name: opts.name, columns: columns! });

        outputJson({ id: table.id, name: table.name });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_CREATE',
        );
      }
    });

  // ── datatable delete <id> ───────────────────────────────────────────────

  dt
    .command('delete <id>')
    .description('Delete a data table')
    .action(async (id: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        if (config.dry) {
          outputJson({ dry: true, action: 'delete', id });
          return;
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        await client.deleteDataTable(id);

        outputJson({ id, deleted: true });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_DELETE',
        );
      }
    });

  // ── datatable insert <id> ───────────────────────────────────────────────

  dt
    .command('insert <id>')
    .description('Insert rows into a data table')
    .option('--data <json>', 'Row data as JSON array or @filepath')
    .option('--stdin', 'Read row data from stdin')
    .action(async (id: string, opts: { data?: string; stdin?: boolean }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError('No API key configured', 'ERR_NO_API_KEY');
        }

        if (!opts.data && !opts.stdin) {
          outputError('Provide --data <json|@file> or --stdin', 'ERR_MISSING_DATA');
        }

        let rawJson: string;

        if (opts.stdin) {
          // Read from stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
          }
          rawJson = Buffer.concat(chunks).toString('utf-8');
        } else if (opts.data!.startsWith('@')) {
          // Read from file
          const filePath = opts.data!.slice(1);
          try {
            rawJson = readFileSync(filePath, 'utf-8');
          } catch {
            outputError(`Cannot read file: ${filePath}`, 'ERR_FILE_READ');
          }
        } else {
          rawJson = opts.data!;
        }

        let rows: Array<Record<string, unknown>>;
        try {
          rows = JSON.parse(rawJson!);
        } catch {
          outputError('Invalid JSON for row data', 'ERR_INVALID_JSON');
        }

        if (!Array.isArray(rows!)) {
          outputError('Row data must be a JSON array of objects', 'ERR_INVALID_DATA');
        }

        if (config.dry) {
          outputJson({ dry: true, action: 'insert', id, rowCount: rows!.length });
          return;
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const result = await client.insertDataTableRows(id, rows!);

        outputJson({ insertedRows: result.insertedRows });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputError(err.message, err.code);
        }
        outputError(
          err instanceof Error ? err.message : String(err),
          'ERR_DATATABLE_INSERT',
        );
      }
    });
}
