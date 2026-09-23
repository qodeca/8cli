# 8cli documentation

8cli is a command-line tool for managing an [n8n](https://n8n.io) instance from a terminal, a
script or an AI agent. It talks to n8n over its API, prints JSON you can pipe into `jq`, and
never stops to ask a question.

```bash
export N8N_URL=https://n8n.example.com
export N8N_API_KEY=<your n8n API key>
8cli wf list | jq -r '.[].name'
```

New here? Start with [getting started](getting-started.md).

## User guide

| Page                                                       | What it answers                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [Getting started](getting-started.md)                      | Install, connect to n8n, run your first commands                     |
| [Configuration and credentials](configuration.md)          | Where 8cli reads the URL, the API key and settings – and `8cli.json` |
| [Global options](global-options.md)                        | `--url`, `--api-key`, `--table`, `--dry`, `--verbose` and the rest   |
| [Output, errors and exit codes](output-and-errors.md)      | The JSON contract, every error code, and its exceptions              |
| [Community and Enterprise n8n](community-vs-enterprise.md) | Which commands need a paid n8n license, and what you see without one |
| [Security notes](security.md)                              | How 8cli handles your API key, password and plain-HTTP URLs          |
| [Troubleshooting and FAQ](troubleshooting.md)              | Common errors and how to fix them                                    |

## Command reference

One page per command group, with every subcommand, flag, a real example, the output shape and
the error codes. Start at the [command reference index](reference/README.md).

| Group                                           | Alias  | What it manages                                   |
| ----------------------------------------------- | ------ | ------------------------------------------------- |
| [`auth`](reference/auth.md)                     |        | Stored credentials in the macOS keychain          |
| [`config`](reference/config.md)                 |        | The configuration 8cli resolved                   |
| [`workflow`](reference/workflow.md)             | `wf`   | Workflows: list, back up, diff, publish, activate |
| [`execution`](reference/execution.md)           | `exec` | Workflow runs                                     |
| [`credential`](reference/credential.md)         | `cred` | n8n credentials (names and metadata only)         |
| [`tag`](reference/tag.md)                       |        | Workflow tags                                     |
| [`variable`](reference/variable.md)             | `var`  | Instance variables                                |
| [`project`](reference/project.md)               | `proj` | Projects                                          |
| [`user`](reference/user.md)                     |        | Users                                             |
| [`folder`](reference/folder.md)                 |        | Workflow folders                                  |
| [`datatable`](reference/datatable.md)           | `dt`   | Data tables and their rows                        |
| [`audit`](reference/audit.md)                   |        | n8n's security audit                              |
| [`source-control`](reference/source-control.md) | `sc`   | n8n source control (Git) status and pull          |

## Guides

Task-focused walkthroughs – see the [guides index](guides/README.md).

- [Using 8cli from AI agents](guides/ai-agents.md) – Claude Code and other agents.
- [jq recipes](guides/jq-recipes.md) – filter, count and reshape the JSON output.
- [Using 8cli in CI](guides/ci.md) – scheduled backups and publish jobs.
- [Back up, diff and publish workflows](guides/workflow-lifecycle.md) – keep workflows in Git.
- [Folder commands and the internal API](guides/folders.md) – why folders need a password.

## How the examples were made

Every example in this guide was run against a local n8n 2.40.5 Community edition, and the output
shown is the real output, trimmed where it was long (a trimmed part is marked `…` or described
in the text). The examples assume `N8N_URL` and `N8N_API_KEY` are set. Paths are shown under
`/work`, which stands for your current directory. JSON is shown pretty-printed, so spacing can
differ slightly from your terminal; compact `jq -c` output is shown exactly. No real API key,
password or email address appears in them.

## For contributors

Documents for people who work on 8cli itself, not with it. A folder appears when its first
document does.

| Path                                     | What lands there                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [`docs/designs`](designs/README.md)      | one folder per designed feature, and the index `README.md`             |
| [`docs/runbooks`](runbooks/local-n8n.md) | how to run things, such as the local n8n used to test 8cli             |
| `docs/validation`                        | validation reports of 8cli against a specific n8n version              |
| `docs/architecture`                      | decision records, architecture pages, structure diagrams               |
| `docs/spikes`                            | the findings page of a spike; never its prototype code                 |
| `docs/deprecations`                      | what goes, its replacement, the dates                                  |
| `docs/performance`                       | how a number was measured, and the baselines                           |
| `docs/migrations`                        | one page per schema, data or format move, with a `reversibility:` line |

Each path is set by a `paths.*` key in `.xezar/pipeline/config.json`; change the key, not this
table, if a folder moves.
