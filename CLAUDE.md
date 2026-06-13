# CLAUDE.md – 8cli

## Overview

AI-first n8n remote management CLI. JSON output by default, no interactive prompts, composable with `jq` and other tools. Designed for both AI agents (Claude Code) and humans.

| Detail | Value |
|--------|-------|
| **Runtime** | Node.js 22+ (native fetch) |
| **Language** | TypeScript (strict, nodenext) |
| **Package** | `@qodeca/8cli` (scoped npm); CLI command stays `8cli` |
| **Entry point** | `bin/8cli.ts` (dev via `tsx`); built to `dist/bin/8cli.js` (`#!/usr/bin/env node`) |
| **Build** | `tsc` → `dist/` (runs on `prepublishOnly`); not needed for local dev |
| **License** | GPL-3.0-only – every `.ts` file carries an SPDX header (see Licensing) |
| **Dependencies** | commander, chalk, cli-table3, diff |

## Quick start

```bash
npm install

# Store credentials (macOS Keychain)
npx tsx bin/8cli.ts --url https://your-n8n.com auth set-api-key --value <key>
npx tsx bin/8cli.ts --url https://your-n8n.com auth verify

# Use commands
npx tsx bin/8cli.ts --url https://your-n8n.com wf list
npx tsx bin/8cli.ts --url https://your-n8n.com wf list --table
npx tsx bin/8cli.ts --url https://your-n8n.com wf list | jq '.[].name'
```

## Architecture

```
bin/8cli.ts                    Entry point (shebang, imports src/cli.ts)
src/
├── cli.ts                     Commander setup, global options, registers all commands
├── config.ts                  Config resolution: CLI flags → env vars → config file → keychain
├── types.ts                   All shared TypeScript interfaces
├── client/
│   ├── base.ts                BaseClient: native fetch, pagination, retry on 429
│   ├── public-api.ts          PublicApiClient (X-N8N-API-KEY header)
│   └── internal-api.ts        InternalApiClient (cookie auth for folder operations)
├── keychain/
│   ├── index.ts               Platform dispatcher
│   ├── macos.ts               macOS Keychain via `security` CLI
│   ├── windows.ts             Stub (future)
│   └── linux.ts               Stub (future)
├── commands/
│   ├── auth.ts                auth login|logout|list|verify|set-api-key|set-credentials
│   ├── config.ts              config show
│   ├── workflow.ts            wf list|get|save|publish|activate|deactivate|delete|diff
│   ├── execution.ts           exec list|get|delete
│   ├── credential.ts          cred list|delete|transfer
│   ├── tag.ts                 tag list|create|update|delete
│   ├── variable.ts            var list|set|delete
│   ├── project.ts             proj list|create|update|delete
│   ├── user.ts                user list|get
│   ├── folder.ts              folder tree|create|delete|move|sync
│   ├── datatable.ts           dt list|get|rows|create|delete|insert
│   ├── audit.ts               audit run
│   └── source-control.ts      sc status|pull|push
└── formatters/
    ├── index.ts               Output dispatcher (JSON default, table opt-in)
    ├── json.ts                JSON.stringify to stdout
    └── table.ts               cli-table3 rendering
```

## AI-first design principles

1. **JSON output by default** – every command outputs valid JSON to stdout
2. **Structured errors** – errors go to stderr as `{ "error": "...", "code": "ERR_..." }` with exit code 1
3. **No interactive prompts** – all input via flags/args, never readline/inquirer
4. **Composable output** – list commands output arrays, get commands output objects
5. **Predictable file output** – write commands report `{ "files": [...] }`
6. **Idempotent operations** – safe to run repeatedly, `--dry` for previewing
7. **Minimal config** – works with just `--url` and keychain, or `N8N_URL`/`N8N_API_KEY` env vars

## Config resolution priority

CLI flags → env vars → config file → keychain → defaults

| Source | Example |
|--------|---------|
| CLI flags | `--url https://n8n.example.com --api-key eyJ...` |
| Env vars | `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD` |
| Config file | `8cli.json` in cwd or `configs/` (non-secret settings only) |
| Keychain | macOS Keychain, service `8cli`, accounts `{url}/api-key` etc. |

## Credential security

Secrets are **never** stored in config files. They live in the OS keychain:
- **Service name**: `8cli`
- **Account names**: `{url}/api-key`, `{url}/email`, `{url}/password`
- **macOS**: `security add-generic-password` / `find-generic-password` / `delete-generic-password`
- **Windows/Linux**: stubs – not yet implemented

## Global options

| Flag | Purpose |
|------|---------|
| `--url <url>` | n8n instance URL |
| `--api-key <key>` | API key (overrides keychain) |
| `--config <path>` | Config file path |
| `--table` | Human-readable table output |
| `--dry` | Preview changes without applying |
| `--verbose` | Debug logging to stderr |

## n8n API gotchas

These are already handled in the code but important to know:

1. `PUT /workflows/{id}` rejects extra fields – only send: `name`, `nodes`, `connections`, `settings` (only `executionOrder`), `staticData`
2. `active` is read-only on PUT – always strip from publish payload
3. Settings only accepts `executionOrder` – strip all other settings keys
4. Public API doesn't expose folder info – internal API (cookie auth) needed for folders
5. Execution data needs `?includeData=true` query param on GET

## Two API clients

- **PublicApiClient** (`X-N8N-API-KEY` header) – covers most endpoints (`/api/v1/...`)
- **InternalApiClient** (cookie auth via `/rest/login`) – only for folder operations (`/rest/...`)

Folder commands require email/password credentials (`auth set-credentials` or `N8N_EMAIL`/`N8N_PASSWORD` env vars).

## Command pattern

Every command file exports a `register*Commands(program: Command)` function:

```typescript
import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { PublicApiClient } from '../client/public-api.js';
import { output, outputError, outputJson } from '../formatters/index.js';

export function registerFooCommands(program: Command): void {
  const foo = program.command('foo').alias('f').description('Manage foos');

  foo.command('list').description('List all foos').action(async () => {
    try {
      const config = await resolveConfig(program.opts());
      if (!config.url || !config.apiKey) {
        outputError('No n8n URL or API key configured', 'ERR_NO_CONFIG');
      }
      const client = new PublicApiClient(config.url, config.apiKey, config.verbose);
      const foos = await client.listFoos();
      output(foos, { table: config.table });
    } catch (err) {
      outputError(err instanceof Error ? err.message : String(err), 'ERR_FOO_LIST');
    }
  });
}
```

## Development

```bash
npm install                        # Install dependencies
npm run typecheck                  # Type check (tsc --noEmit)
npx tsx bin/8cli.ts --help         # Run raw TS directly via tsx (no build needed for dev)
npx tsx bin/8cli.ts wf list        # Run a command
npm run build                      # Compile to dist/ (tsc) – produces the published artifact
node dist/bin/8cli.js --help       # Run the compiled CLI (what installed users get)
```

Dev runs raw TypeScript via `tsx`; the published npm package ships compiled `dist/` only
(`files: ["dist", "THIRD-PARTY-LICENSES.md"]`), so the build runs automatically on
`prepublishOnly`. No test suite yet.

## Licensing and headers

GPL-3.0-only. Every source file under `bin/` and `src/` starts with an SPDX header – add it
to any new file:

```
// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca
```

In `bin/8cli.ts` the header sits immediately after the `#!/usr/bin/env node` shebang.
Bundled third-party notices live in `THIRD-PARTY-LICENSES.md`; regenerate it with
`npx license-checker --production` when dependencies change. End-user docs live in
`README.md`; vulnerability-reporting policy in `SECURITY.md`.

## Style rules

- **Sentence case** not Title Case (e.g., "User settings" not "User Settings")
- **en dashes** (–) not em dashes (—)
- One file per command group (not one-file-per-subcommand)
- Errors always to stderr as structured JSON
- Success output always to stdout as JSON (unless `--table`)
