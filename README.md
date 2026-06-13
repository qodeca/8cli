# 8cli

An AI-first command-line interface for remote-managing [n8n](https://n8n.io) instances.
JSON output by default, no interactive prompts, composable with `jq` and other tools –
designed for both AI agents (such as Claude Code) and humans.

```bash
8cli --url https://your-n8n.example.com wf list | jq '.[].name'
```

## Features

- **JSON-native** – every command emits valid JSON to stdout; errors go to stderr as
  `{ "error": "...", "code": "ERR_..." }` with a non-zero exit code.
- **Non-interactive** – all input via flags and arguments; safe for scripts, CI, and agents.
- **Composable** – list commands return arrays, get commands return objects; pipe into `jq`.
- **Secrets in the OS keychain** – API keys never touch config files.
- **No build needed to hack on it** – TypeScript run directly via `tsx` in development.

## Requirements

- Node.js **22+** (uses native `fetch`)
- An n8n instance with API access

## Install

```bash
npm install -g @qodeca/8cli
```

Or run without installing:

```bash
npx @qodeca/8cli --url https://your-n8n.example.com wf list
```

## Quick start

```bash
# Store an API key in the OS keychain (macOS)
8cli --url https://your-n8n.example.com auth set-api-key --value <your-api-key>
8cli --url https://your-n8n.example.com auth verify

# List workflows (JSON by default)
8cli --url https://your-n8n.example.com wf list

# Human-readable table
8cli --url https://your-n8n.example.com wf list --table

# Compose with jq
8cli --url https://your-n8n.example.com wf list | jq '.[] | {id, name, active}'
```

Configuration can also come from environment variables (`N8N_URL`, `N8N_API_KEY`,
`N8N_EMAIL`, `N8N_PASSWORD`), so the `--url`/`--api-key` flags are optional once they are set.

## Commands

| Group | Alias | Subcommands |
|-------|-------|-------------|
| `auth` | | `login`, `logout`, `list`, `verify`, `set-api-key`, `set-credentials` |
| `config` | | `show` |
| `workflow` | `wf` | `list`, `get`, `save`, `publish`, `activate`, `deactivate`, `delete`, `diff` |
| `execution` | `exec` | `list`, `get`, `delete` |
| `credential` | `cred` | `list`, `delete`, `transfer` |
| `tag` | | `list`, `create`, `update`, `delete` |
| `variable` | `var` | `list`, `set`, `delete` |
| `project` | `proj` | `list`, `create`, `update`, `delete` |
| `user` | | `list`, `get` |
| `folder` | | `tree`, `create`, `delete`, `move`, `sync` |
| `datatable` | `dt` | `list`, `get`, `rows`, `create`, `delete`, `insert` |
| `audit` | | `run` |
| `source-control` | `sc` | `status`, `pull`, `push` |

Run `8cli <group> --help` for the options of any group.

## Global options

| Flag | Purpose |
|------|---------|
| `--url <url>` | n8n instance URL |
| `--api-key <key>` | API key (overrides keychain) |
| `--config <path>` | Config file path |
| `--table` | Human-readable table output instead of JSON |
| `--dry` | Preview changes without applying them |
| `--verbose` | Debug logging to stderr |

## Configuration and credentials

Configuration is resolved in priority order: **CLI flags → environment variables →
config file → OS keychain → defaults**. Secrets are **never** written to config files –
they live in the OS keychain (service name `8cli`).

- **macOS** – fully supported via the `security` keychain CLI.
- **Windows / Linux** – keychain backends are stubs and not yet implemented; use the
  `N8N_API_KEY` (and `N8N_EMAIL` / `N8N_PASSWORD`) environment variables in the meantime.

### Note on folder commands (internal API)

Most commands use n8n's documented public API (`/api/v1`, `X-N8N-API-KEY` header). The
**`folder`** commands use n8n's **internal** `/rest` API with cookie/session authentication,
because the public API does not expose folder information. As a result:

- Folder commands require email/password credentials (`auth set-credentials` or
  `N8N_EMAIL` / `N8N_PASSWORD`).
- They depend on undocumented, unversioned endpoints that **may change or break across n8n
  upgrades**.

## Disclaimer

8cli is an independent, third-party tool. It is **not** affiliated with, endorsed by, or
sponsored by n8n GmbH. "n8n" is a trademark of n8n GmbH, used here only to describe
compatibility.

## License

8cli is licensed under the **GNU General Public License v3.0 only** – see
[`LICENSE`](./LICENSE) for the full text. Bundled third-party dependencies and their
notices are listed in [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md);
development-only dependencies are not distributed.

This project was extracted from an internal Qodeca monorepo; prior commit history is not
preserved in this repository.
