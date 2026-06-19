// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

// Import command registrars
import { registerAuthCommands } from './commands/auth.js';
import { registerConfigCommands } from './commands/config.js';
import { registerWorkflowCommands } from './commands/workflow.js';
import { registerExecutionCommands } from './commands/execution.js';
import { registerCredentialCommands } from './commands/credential.js';
import { registerTagCommands } from './commands/tag.js';
import { registerVariableCommands } from './commands/variable.js';
import { registerProjectCommands } from './commands/project.js';
import { registerUserCommands } from './commands/user.js';
import { registerFolderCommands } from './commands/folder.js';
import { registerDataTableCommands } from './commands/datatable.js';
import { registerAuditCommands } from './commands/audit.js';
import { registerSourceControlCommands } from './commands/source-control.js';

// Read version from the nearest package.json, walking up from this file.
// This is layout-agnostic: it works both in dev (src/cli.ts) and when compiled
// (dist/src/cli.js), where the extra dist/ level would break a fixed relative path.
function readVersion(): string {
  const require = createRequire(import.meta.url);
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      return (require(candidate) as { version: string }).version;
    }
    dir = dirname(dir);
  }
  return '0.0.0';
}

const pkg = { version: readVersion() };

export function run(): void {
  const program = new Command();

  program
    .name('8cli')
    .description('n8n remote management CLI – AI-first, JSON-native')
    .version(pkg.version)
    .option('--url <url>', 'n8n instance URL')
    .option('--api-key <key>', 'API key for n8n public API')
    .option('--config <path>', 'Path to config file (default: auto-detect)')
    .option('--table', 'Output as table instead of JSON', false)
    .option('--dry', 'Dry-run mode – preview changes without applying', false)
    .option('--verbose', 'Enable verbose logging to stderr', false)
    .option('--insecure', 'Allow plaintext-HTTP n8n URLs (sends the API key in clear text)', false);

  // Register all command groups
  registerAuthCommands(program);
  registerConfigCommands(program);
  registerWorkflowCommands(program);
  registerExecutionCommands(program);
  registerCredentialCommands(program);
  registerTagCommands(program);
  registerVariableCommands(program);
  registerProjectCommands(program);
  registerUserCommands(program);
  registerFolderCommands(program);
  registerDataTableCommands(program);
  registerAuditCommands(program);
  registerSourceControlCommands(program);

  program.parse();
}
