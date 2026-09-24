// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { Command, CommanderError } from 'commander';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import { outputError } from './formatters/index.js';

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

// The `help` command names a command to describe. When the name does not resolve,
// commander answers with a help display instead of an error, so the exit-1 help
// branch is one of two things: the bare invocation or a bare command group, which
// is a help display, or `help <unknown>`, which is a usage error. The parsed
// operands are where commander reports which: the `help` token sits right after
// the command chain it was invoked on, and in this branch a `help` token that
// still has a following operand can only be an unknown target (a resolvable one
// exits 0 above).
function unknownHelpTarget(args: string[]): string | undefined {
  const helpIndex = args.indexOf('help');
  return helpIndex === -1 ? undefined : args[helpIndex + 1];
}

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

  // Commander's own usage errors – a missing required option or argument, an
  // unknown option or command – must obey the AI-first error contract too:
  // `{ "error", "code" }` JSON on stderr with exit code 1. Silencing only the
  // output configuration's `outputError` hook suppresses commander's plain-text
  // line without touching `writeErr`, which stays available for anything else.
  // `--help` and `--version` write to stdout and exit 0 before an error is ever
  // raised, so they are re-exited unchanged.
  //
  // Commander writes a help display to stderr before it calls the exit override,
  // so the override cannot decide after the fact what belongs there. The unknown
  // `help` target is the one stderr help display that is a usage error rather
  // than a help display, so its text is dropped here and the exit override below
  // emits the JSON error instead — stderr stays parseable as one thing, not help
  // text followed by JSON. A bare invocation or bare command group still prints.
  program.configureOutput({
    outputError: () => {},
    writeErr: (str: string) => {
      if (unknownHelpTarget(program.args) === undefined) {
        process.stderr.write(str);
      }
    },
  });
  program.exitOverride((err: CommanderError) => {
    if (err.exitCode === 0) {
      // `--help`, `--version` and `help <command>` already wrote to stdout; re-exit 0.
      process.exit(0);
    }
    if (err.code === 'commander.help') {
      const unknown = unknownHelpTarget(program.args);
      if (unknown !== undefined) {
        // `help <unknown>`: commander could not resolve the named command and fell
        // back to a help display. That is a usage error like any other, so it gets
        // the same structured JSON as `8cli <unknown>` does.
        outputError(`unknown command '${unknown}'`, 'ERR_USAGE', err.exitCode);
      }
      // A bare `8cli`, or a bare command group, is a help display and not an error:
      // let commander exit 1 with the help text it already wrote.
      return;
    }
    outputError(err.message.replace(/^error:\s*/, ''), 'ERR_USAGE', err.exitCode);
  });

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
