# Command reference

Every 8cli command, grouped the way `8cli --help` groups them. Each page has one section per
subcommand with its usage, options, a real example, the output shape and the error codes.

```text
8cli [global options] <group> <subcommand> [arguments] [options]
```

| Group                                 | Alias  | Subcommands                                                                  | Needs a license |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------- | --------------- |
| [`auth`](auth.md)                     |        | `login`, `logout`, `list`, `verify`, `set-api-key`, `set-credentials`        | No              |
| [`config`](config.md)                 |        | `show`                                                                       | No              |
| [`workflow`](workflow.md)             | `wf`   | `list`, `get`, `save`, `publish`, `activate`, `deactivate`, `delete`, `diff` | No              |
| [`execution`](execution.md)           | `exec` | `list`, `get`, `delete`                                                      | No              |
| [`credential`](credential.md)         | `cred` | `list`, `delete`, `transfer`                                                 | No              |
| [`tag`](tag.md)                       |        | `list`, `create`, `update`, `delete`                                         | No              |
| [`variable`](variable.md)             | `var`  | `list`, `set`, `delete`                                                      | Yes             |
| [`project`](project.md)               | `proj` | `list`, `create`, `update`, `delete`                                         | Yes             |
| [`user`](user.md)                     |        | `list`, `get`                                                                | No              |
| [`folder`](folder.md)                 |        | `tree`, `create`, `delete`, `move`, `sync`                                   | Yes             |
| [`datatable`](datatable.md)           | `dt`   | `list`, `get`, `rows`, `create`, `delete`, `insert`                          | No              |
| [`audit`](audit.md)                   |        | `run`                                                                        | No              |
| [`source-control`](source-control.md) | `sc`   | `status`, `pull`, `push`                                                     | Yes             |

"Needs a license" means the n8n Community edition refuses it. See
[Community and Enterprise n8n](../community-vs-enterprise.md).

## Reading these pages

- **Aliases.** A group and its alias are the same command: `8cli workflow list` and
  `8cli wf list` do the same thing. The pages use the short form.
- **Global options** (`--url`, `--api-key`, `--table`, `--dry`, …) work with every command and
  are on [global options](../global-options.md). A section lists only the options that belong to
  that subcommand.
- **`<id>`** is an n8n ID. Workflows, tags, credentials, projects and data tables use 16-character
  strings such as `Jr53yjULv3JYJRgF`; users use UUIDs; executions use numbers written as strings,
  such as `"5"`.
- **Output shape** lists the fields 8cli prints. Where 8cli passes n8n's response through
  unchanged, the page says so, and the fields are the ones n8n 2.40.5 returned.
- **Errors** lists this command's own codes. The codes for missing configuration are on
  [output, errors and exit codes](../output-and-errors.md#missing-configuration).
- **Examples** were run against n8n 2.40.5 Community with `N8N_URL` and `N8N_API_KEY` set. Output
  is real and trimmed where marked.
