// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { createTwoFilesPatch } from 'diff';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputJson, outputError } from '../formatters/index.js';
import type { Config, Workflow } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Replace characters not allowed in filenames with dashes. */
function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '-');
}

/** Build the local filename for a workflow: {id}_{sanitized_name}.json */
function workflowFilename(wf: { id: string; name: string }): string {
  return `${wf.id}_${sanitizeName(wf.name)}.json`;
}

/** Create a PublicApiClient from resolved config. */
function createClient(config: Config): PublicApiClient {
  if (!config.url) {
    outputError(
      'No n8n URL configured. Use --url, N8N_URL env var, or a config file.',
      'ERR_NO_URL',
    );
  }
  if (!config.apiKey) {
    outputError(
      'No API key configured. Use --api-key, N8N_API_KEY env var, or run "8cli auth login".',
      'ERR_NO_API_KEY',
    );
  }
  return new PublicApiClient(config.url, config.apiKey, config.verbose);
}

/**
 * Strip a workflow object down to only the fields accepted by PUT /workflows/{id}.
 * n8n rejects extra fields – only send: name, nodes, connections, settings (executionOrder only), staticData.
 */
function stripForPublish(wf: Record<string, unknown>): Partial<Workflow> {
  const result: Record<string, unknown> = {};

  if (wf.name !== undefined) result.name = wf.name;
  if (wf.nodes !== undefined) result.nodes = wf.nodes;
  if (wf.connections !== undefined) result.connections = wf.connections;
  if (wf.staticData !== undefined) result.staticData = wf.staticData;

  // Settings – only keep executionOrder
  if (wf.settings && typeof wf.settings === 'object') {
    const settings = wf.settings as Record<string, unknown>;
    if (settings.executionOrder !== undefined) {
      result.settings = { executionOrder: settings.executionOrder };
    }
  }

  return result as Partial<Workflow>;
}

/**
 * Read a workflow JSON file and return the parsed content with its id.
 * The id is taken from the file content (must have an `id` field).
 */
function readWorkflowFile(filePath: string): { id: string; data: Record<string, unknown> } {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const id = String(parsed.id ?? '');
  if (!id) {
    throw new Error(`Workflow file ${filePath} does not contain an "id" field`);
  }
  return { id, data: parsed };
}

/**
 * Find all workflow JSON files in a directory.
 * Convention: files matching {id}_{name}.json or any .json file with an id field.
 */
function findWorkflowFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

/**
 * Strip date fields for diff comparison to reduce noise.
 */
function stripDates(obj: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...obj };
  delete copy.updatedAt;
  delete copy.createdAt;
  return copy;
}

// ── Command registration ─────────────────────────────────────────────────────

export function registerWorkflowCommands(program: Command): void {
  const wf = program.command('workflow').alias('wf').description('Manage workflows');

  // ── list ─────────────────────────────────────────────────────────────────

  wf.command('list')
    .description('List all workflows')
    .action(async () => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const workflows = await client.listWorkflows();

        const items = workflows.map((w) => ({
          id: w.id,
          name: w.name,
          active: w.active,
          updatedAt: w.updatedAt,
        }));

        output(items, {
          table: config.table,
          columns: [
            { key: 'id', header: 'ID', width: 6 },
            { key: 'name', header: 'Name', width: 40 },
            { key: 'active', header: 'Active', width: 8 },
            { key: 'updatedAt', header: 'Updated', width: 24 },
          ],
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_LIST');
      }
    });

  // ── get ──────────────────────────────────────────────────────────────────

  wf.command('get')
    .description('Get full workflow JSON by ID')
    .argument('<id>', 'Workflow ID')
    .action(async (id: string) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const workflow = await client.getWorkflow(id);
        outputJson(workflow);
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_GET');
      }
    });

  // ── save ─────────────────────────────────────────────────────────────────

  wf.command('save')
    .description('Save workflow(s) to local JSON files')
    .option('--id <id>', 'Save only the workflow with this ID')
    .option('--dir <path>', 'Output directory (default: from config workflowDir)')
    .action(async (opts: { id?: string; dir?: string }) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const dir = resolve(opts.dir || config.workflowDir);

        let workflows: Workflow[];
        if (opts.id) {
          workflows = [await client.getWorkflow(opts.id)];
        } else {
          // Fetch all workflows with full details
          const list = await client.listWorkflows();
          workflows = await Promise.all(list.map((w) => client.getWorkflow(w.id)));
        }

        if (config.dry) {
          const files = workflows.map((w) => join(dir, workflowFilename(w)));
          outputJson({ dryRun: true, files });
          return;
        }

        // Ensure directory exists
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const files: string[] = [];
        for (const wf of workflows) {
          const filePath = join(dir, workflowFilename(wf));
          writeFileSync(filePath, JSON.stringify(wf, null, 2) + '\n', 'utf-8');
          files.push(filePath);
        }

        outputJson({ files });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_SAVE');
      }
    });

  // ── publish ──────────────────────────────────────────────────────────────

  wf.command('publish')
    .description('Publish local workflow JSON files to n8n')
    .option('--id <id>', 'Publish only the file matching this workflow ID')
    .option('--file <path>', 'Publish a specific file')
    .action(async (opts: { id?: string; file?: string }) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const dir = resolve(config.workflowDir);

        // Determine which files to publish
        let filePaths: string[];
        if (opts.file) {
          filePaths = [resolve(opts.file)];
        } else {
          filePaths = findWorkflowFiles(dir);
          if (opts.id) {
            filePaths = filePaths.filter((f) => {
              try {
                const { id } = readWorkflowFile(f);
                return id === opts.id;
              } catch {
                return false;
              }
            });
          }
        }

        if (filePaths.length === 0) {
          outputError('No workflow files found to publish', 'ERR_NO_FILES');
        }

        // Get existing workflow IDs to know if we should create or update
        const existingWorkflows = await client.listWorkflows();
        const existingIds = new Set(existingWorkflows.map((w) => w.id));

        const updated: Array<{ id: string; name: string }> = [];
        // A create's real id is assigned by n8n on publish, so it is null in a
        // dry-run preview (the local file id is read-only and won't be used).
        const created: Array<{ id: string | null; name: string }> = [];
        const errors: Array<{ file: string; error: string }> = [];

        for (const filePath of filePaths) {
          try {
            const { id, data } = readWorkflowFile(filePath);
            const payload = stripForPublish(data);

            if (config.dry) {
              if (existingIds.has(id)) {
                updated.push({ id, name: String(data.name ?? '') });
              } else {
                created.push({ id: null, name: String(data.name ?? '') });
              }
              continue;
            }

            if (existingIds.has(id)) {
              await client.updateWorkflow(id, payload);
              updated.push({ id, name: String(data.name ?? '') });
            } else {
              // n8n's public API rejects a client-supplied `id` on create
              // (`request/body/id is read-only`), so publish only sends the
              // stripped payload and reports the server-assigned id.
              const result = await client.createWorkflow(payload);
              created.push({ id: result.id, name: result.name });
            }
          } catch (err) {
            errors.push({
              file: basename(filePath),
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const result: Record<string, unknown> = { updated, created, errors };
        if (config.dry) result.dryRun = true;
        outputJson(result);
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_PUBLISH');
      }
    });

  // ── activate ─────────────────────────────────────────────────────────────

  wf.command('activate')
    .description('Activate a workflow')
    .argument('<id>', 'Workflow ID')
    .action(async (id: string) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const result = await client.activateWorkflow(id);
        outputJson({ id: result.id, name: result.name, active: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_ACTIVATE');
      }
    });

  // ── deactivate ───────────────────────────────────────────────────────────

  wf.command('deactivate')
    .description('Deactivate a workflow')
    .argument('<id>', 'Workflow ID')
    .action(async (id: string) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const result = await client.deactivateWorkflow(id);
        outputJson({ id: result.id, name: result.name, active: false });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_DEACTIVATE');
      }
    });

  // ── delete ───────────────────────────────────────────────────────────────

  wf.command('delete')
    .description('Delete a workflow')
    .argument('<id>', 'Workflow ID')
    .action(async (id: string) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);

        if (config.dry) {
          outputJson({ dryRun: true, id, deleted: false });
          return;
        }

        await client.deleteWorkflow(id);
        outputJson({ id, deleted: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_DELETE');
      }
    });

  // ── diff ─────────────────────────────────────────────────────────────────

  wf.command('diff')
    .description('Compare local workflow file vs remote')
    .argument('<id>', 'Workflow ID')
    .option('--dir <path>', 'Directory with local workflow files (default: from config)')
    .action(async (id: string, opts: { dir?: string }) => {
      try {
        const config = await resolveConfig(program.opts());
        const client = createClient(config);
        const dir = resolve(opts.dir || config.workflowDir);

        // Find the local file for this workflow ID
        const files = findWorkflowFiles(dir);
        const localFile = files.find((f) => {
          try {
            const { id: fileId } = readWorkflowFile(f);
            return fileId === id;
          } catch {
            return false;
          }
        });

        if (!localFile) {
          outputError(`No local file found for workflow ${id} in ${dir}`, 'ERR_NO_LOCAL_FILE');
        }

        // Fetch remote workflow
        const remote = await client.getWorkflow(id);

        // Read local file
        const { data: local } = readWorkflowFile(localFile!);

        // Strip date fields for comparison
        const localClean = stripDates(local);
        const remoteClean = stripDates(remote as unknown as Record<string, unknown>);

        const localJson = JSON.stringify(localClean, null, 2) + '\n';
        const remoteJson = JSON.stringify(remoteClean, null, 2) + '\n';

        const patch = createTwoFilesPatch(
          `local/${basename(localFile!)}`,
          `remote/${id}`,
          localJson,
          remoteJson,
          'local',
          'remote',
        );

        // Check if there are actual differences (patch header is always present)
        const hasChanges = patch
          .split('\n')
          .some(
            (line) =>
              (line.startsWith('+') && !line.startsWith('+++')) ||
              (line.startsWith('-') && !line.startsWith('---')),
          );

        if (!hasChanges) {
          outputJson({ id, diff: null, message: 'No differences found' });
        } else {
          // Output raw diff text to stdout for readability
          process.stdout.write(patch);
        }
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_WORKFLOW_DIFF');
      }
    });
}
