// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerProjectCommands(program: Command): void {
  const proj = program.command('project').alias('proj').description('Manage projects');

  // ── list ────────────────────────────────────────────────────────────────

  proj
    .command('list')
    .description('List all projects')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError(
            'Missing url or apiKey – run "8cli auth login" or pass --url and --api-key',
            'ERR_NO_CONFIG',
          );
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const projects = await client.listProjects();
        output(projects, { table: config.table });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_PROJECT_LIST');
      }
    });

  // ── create ──────────────────────────────────────────────────────────────

  proj
    .command('create <name>')
    .description('Create a new project')
    .action(async (name: string) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError(
            'Missing url or apiKey – run "8cli auth login" or pass --url and --api-key',
            'ERR_NO_CONFIG',
          );
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const project = await client.createProject(name);
        outputJson({ id: project.id, name: project.name });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_PROJECT_CREATE');
      }
    });

  // ── update ──────────────────────────────────────────────────────────────

  proj
    .command('update <id>')
    .description('Update a project name')
    .requiredOption('--name <name>', 'New project name')
    .action(async (id: string, opts: { name: string }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError(
            'Missing url or apiKey – run "8cli auth login" or pass --url and --api-key',
            'ERR_NO_CONFIG',
          );
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        const project = await client.updateProject(id, opts.name);
        outputJson({ id: project.id, name: project.name });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_PROJECT_UPDATE');
      }
    });

  // ── delete ──────────────────────────────────────────────────────────────

  proj
    .command('delete <id>')
    .description('Delete a project')
    .option('--transfer-to <projectId>', 'Transfer resources to another project before deletion')
    .action(async (id: string, opts: { transferTo?: string }) => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);
        if (!config.url || !config.apiKey) {
          outputError(
            'Missing url or apiKey – run "8cli auth login" or pass --url and --api-key',
            'ERR_NO_CONFIG',
          );
        }
        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
        await client.deleteProject(id, opts.transferTo);
        outputJson({ id, deleted: true });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_PROJECT_DELETE');
      }
    });
}
