<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# e2e coverage map

Traceability from the 8cli command surface to the tests that lock it. Branch
legend: **happy** · **404** (not found) · **401** (bad key) · **gated**
(license-gated error contract on free Community n8n) · **dry** (`--dry`
no-mutation) · **table** (`--table`) · **snap** (JSON golden snapshot) ·
**err** (other structured `{error,code}`).

The suite targets **free Community n8n with no license**, so license-gated
groups (variable, project, folder, source-control) are covered as the
gated-error contract, not happy paths. The CLI's stable contract is the JSON it
prints; `toFailWithCode` locks the structured-error shape, golden snapshots lock
representative success shapes.

| Command     | Subcommand                     | Covered branches                                                                     | Spec                                       |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| auth        | set-api-key                    | happy, stdin `-`                                                                     | `e2e-macos/auth.e2e.ts`                    |
| auth        | set-credentials                | happy (email+password), stdin `-`                                                    | `e2e-macos/auth.e2e.ts`                    |
| auth        | list                           | happy (non-empty)                                                                    | `e2e-macos/auth.e2e.ts`                    |
| auth        | verify                         | happy, 401                                                                           | `e2e/auth.e2e.ts`, `e2e-macos/auth.e2e.ts` |
| auth        | logout                         | happy                                                                                | `e2e-macos/auth.e2e.ts`                    |
| auth        | login                          | happy (global `--api-key` + email/password), stdin `-`                               | `e2e-macos/auth.e2e.ts`                    |
| config      | show                           | happy, precedence, `--verbose`, `--insecure`, ERR_NO_URL                             | `e2e/config.e2e.ts`                        |
| wf          | list                           | happy, table, snap (item)                                                            | `e2e/workflow.e2e.ts`                      |
| wf          | get                            | happy, 404, no-key, snap                                                             | `e2e/workflow.e2e.ts`                      |
| wf          | save                           | happy (`--id`), happy (all)                                                          | `e2e/workflow.e2e.ts`                      |
| wf          | publish                        | update (+gotcha strip), create, dry, ERR_NO_FILES                                    | `e2e/workflow.e2e.ts`                      |
| wf          | activate / deactivate          | happy (trigger)                                                                      | `e2e/workflow.e2e.ts`                      |
| wf          | delete                         | happy, dry                                                                           | `e2e/workflow.e2e.ts`                      |
| wf          | diff                           | both branches (no-diff JSON, raw diff)                                               | `e2e/workflow.e2e.ts`                      |
| exec        | list                           | array, `--workflow`/`--limit`/`--status` accepted                                    | `e2e/execution.e2e.ts`                     |
| exec        | get                            | 404, `--data` 404                                                                    | `e2e/execution.e2e.ts`                     |
| exec        | delete                         | 404                                                                                  | `e2e/execution.e2e.ts`                     |
| cred        | list                           | happy                                                                                | `e2e/credential.e2e.ts`                    |
| cred        | delete                         | happy, 404                                                                           | `e2e/credential.e2e.ts`                    |
| cred        | transfer                       | err (invalid project)                                                                | `e2e/credential.e2e.ts`                    |
| tag         | create/list/update/delete      | happy, table, 404                                                                    | `e2e/tag.e2e.ts`                           |
| var         | list/set/delete                | gated                                                                                | `e2e/variable.e2e.ts`                      |
| proj        | list/create/update/delete      | gated                                                                                | `e2e/project.e2e.ts`                       |
| user        | list/get                       | happy, 404, snap                                                                     | `e2e/user.e2e.ts`                          |
| folder      | tree                           | gated, no-credentials                                                                | `e2e/folder.e2e.ts`                        |
| folder      | create                         | gated                                                                                | `e2e/folder.e2e.ts`                        |
| folder      | sync                           | ERR_DIR_NOT_FOUND, gated                                                             | `e2e/folder.e2e.ts`                        |
| folder      | move                           | err (unknown workflow / gated)                                                       | `e2e/folder.e2e.ts`                        |
| dt          | list                           | happy, table (formatter)                                                             | `e2e/datatable.e2e.ts`                     |
| dt          | get                            | happy, snap                                                                          | `e2e/datatable.e2e.ts`                     |
| dt          | rows                           | happy, `--limit` cap                                                                 | `e2e/datatable.e2e.ts`                     |
| dt          | create                         | happy, dry, ERR_INVALID_JSON                                                         | `e2e/datatable.e2e.ts`                     |
| dt          | delete                         | happy                                                                                | `e2e/datatable.e2e.ts`                     |
| dt          | insert                         | `--data`, `--stdin`, `@file`, dry, ERR_MISSING_DATA, ERR_INVALID_DATA, ERR_FILE_READ | `e2e/datatable.e2e.ts`                     |
| audit       | run                            | happy (report shape)                                                                 | `e2e/audit.e2e.ts`                         |
| sc          | status / pull / pull `--force` | gated                                                                                | `e2e/source-control.e2e.ts`                |
| sc          | push                           | not-supported (`ERR_NOT_SUPPORTED`)                                                  | `e2e/source-control.e2e.ts`                |
| (transport) | any command, closed port       | structured error, exit 1                                                             | `e2e/transport.e2e.ts`                     |

## Unit (right-altitude, not e2e)

| Target                                 | Covered                                           | Spec                                        |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| `BaseClient` 429 retry/backoff         | retry-then-succeed, budget-exhausted, Retry-After | `test/base-retry.test.ts`                   |
| `BaseClient.paginateAll` cursor loop   | multi-page concat + cursor forwarding             | `test/pagination.test.ts`                   |
| config / formatters / keychain helpers | pure-function units                               | `test/{config,formatters,keychain}.test.ts` |

## Deferred (with rationale)

- **Real workflow executions** – `exec get --data` / `exec delete` happy paths and `exec list` filter _semantics_ (the current array assertion only checks the filters are accepted). Requires triggering a real run (manual/webhook); comparatively expensive and brittle for marginal contract value.
- **Licensed folders / projects happy paths** – require an n8n license. 8cli targets free Community n8n, so the gated-error contract is the correct coverage. `folder sync --dry` no-mutation preview also needs folders (licensed).
- **`config show` snapshot** – output includes the random container `url` and the masked `apiKey`, neither volatile-by-key; would need `redact.ts` extended to mask them. Asserted by field instead.
- **Per-command `--table` snapshots** – over-coverage; one formatter assertion (`dt list`) plus the `wf`/`tag` table checks suffice.
