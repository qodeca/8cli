// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { resolveConfig, maskApiKey } from '../config.js';
import { outputJson } from '../formatters/index.js';
import { outputError } from '../formatters/index.js';

export function registerConfigCommands(program: Command): void {
  const config = program.command('config').description('View resolved configuration');

  config
    .command('show')
    .description('Display the resolved configuration (API key masked)')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const resolved = await resolveConfig(parentOpts);

        outputJson({
          url: resolved.url || '(not set)',
          apiKey: maskApiKey(resolved.apiKey),
          email: resolved.email || '(not set)',
          password: resolved.password ? '****' : '(not set)',
          workflowDir: resolved.workflowDir,
          table: resolved.table,
          dry: resolved.dry,
          verbose: resolved.verbose,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_CONFIG');
      }
    });
}
