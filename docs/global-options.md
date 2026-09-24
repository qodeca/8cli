# Global options

These options work with every command. You can put them before the command group
(`8cli --table wf list`) or after the subcommand (`8cli wf list --table`); both work. Putting
them first is the clearest.

```text
Usage: 8cli [options] [command]

Options:
  -V, --version      output the version number
  --url <url>        n8n instance URL
  --api-key <key>    API key for n8n public API
  --config <path>    Path to config file (default: auto-detect)
  --table            Output as table instead of JSON (default: false)
  --dry              Dry-run mode – preview changes without applying (default:
                     false)
  --verbose          Enable verbose logging to stderr (default: false)
  --insecure         Allow plaintext-HTTP n8n URLs (sends the API key in clear
                     text) (default: false)
  -h, --help         display help for command
```

| Option            | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| `--url <url>`     | The n8n base URL. Beats `N8N_URL` and `url` in `8cli.json`.                           |
| `--api-key <key>` | The n8n API key. Beats `N8N_API_KEY` and the keychain.                                |
| `--config <path>` | Read this config file instead of looking for `./8cli.json` and `./configs/8cli.json`. |
| `--table`         | Print list results as a table for humans. JSON stays the default.                     |
| `--dry`           | Preview a change without making it – only on the commands listed below.               |
| `--verbose`       | Log each HTTP request and response status to stderr.                                  |
| `--insecure`      | Allow a plain `http://` URL that is not `localhost` or `127.0.0.1`.                   |
| `-V`, `--version` | Print the version and exit.                                                           |
| `-h`, `--help`    | Print help for 8cli, a group or a subcommand, and exit.                               |

## `--url` and `--api-key`

```bash
read -rs N8N_API_KEY && export N8N_API_KEY
```

```bash
8cli --url https://n8n.example.com wf list
```

The silent `read` keeps the key out of terminal output and shell history. A key passed with
`--api-key` is visible in process listings such as `ps`; prefer `N8N_API_KEY` or the keychain.

`--api-key -` reads the key from standard input **only for `auth login`**. On any other command
`-` is sent to n8n as the key itself and fails with `Unauthorized`. See
[`auth login`](reference/auth.md#auth-login).

## `--config`

```bash
8cli --config ./deploy/8cli.json config show | jq -c '{url, workflowDir}'
```

```text
{"url":"http://localhost:5678","workflowDir":"n8n/workflows"}
```

See [the config file](configuration.md#the-config-file-8clijson) for its format.

## `--table`

Prints a table instead of JSON. It only changes commands that return a list; commands that
return a single object print JSON either way.

```bash
8cli --table dt list
```

```text
┌────────────────────┬──────────────────────────────┬────────────────┐
│ ID                 │ Name                         │ Columns        │
├────────────────────┼──────────────────────────────┼────────────────┤
│ S1NeX6x9xdFj19Tm   │ orders                       │ orderId, total │
└────────────────────┴──────────────────────────────┴────────────────┘
```

Know its limits:

- Some tables use fixed column widths and cut long values with `…` (the `wf list` ID column is
  six characters wide). Do not copy IDs from a table.
- Nested values print as `[object Object]` (for example `shared` in `cred list`).
- An empty list prints `(no data)`.
- `folder tree --table` prints an indented plain-text tree, not a table.

Tables are for people. Scripts and agents should read the JSON.

## `--dry`

Shows what a command would do and changes nothing. **Only these commands honour it:**

| Command       | What `--dry` returns                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `wf save`     | `{ "dryRun": true, "files": [...] }` – the files it would write                       |
| `wf publish`  | `{ "updated", "created", "errors", "dryRun": true }`                                  |
| `wf delete`   | `{ "dryRun": true, "id": "…", "deleted": false, "wouldUnpublish", "wouldBeRefused" }` |
| `dt create`   | `{ "dry": true, "action": "create", "name", "columns" }`                              |
| `dt delete`   | `{ "dry": true, "action": "delete", "id" }`                                           |
| `dt insert`   | `{ "dry": true, "action": "insert", "id", "rowCount" }`                               |
| `folder sync` | `{ "dry": true, "moved": [...], "created": [...] }`                                   |

> **Warning:** every other command **ignores `--dry` and makes the change.** `8cli --dry tag
delete <id>` deletes the tag. The same goes for `wf activate`, `wf deactivate`, `exec delete`,
> `cred delete`, `cred transfer`, `tag create|update|delete`, `var set|delete`,
> `proj create|update|delete`, `folder create|delete|move` and `sc pull`.

Note the two spellings: the `wf` commands say `dryRun`, the `dt` and `folder` commands say `dry`.

```bash
8cli --dry wf delete H1lrBYWCZUIi7zgE
```

```json
{
  "dryRun": true,
  "id": "H1lrBYWCZUIi7zgE",
  "deleted": false,
  "wouldUnpublish": false,
  "wouldBeRefused": false
}
```

## `--verbose`

Writes one line per HTTP request and one per response status to stderr, so stdout stays clean
JSON:

```bash
8cli --verbose tag list
```

stderr:

```text
[8cli] GET http://localhost:5678/api/v1/tags
[8cli] Response: 200
```

stdout:

```json
[]
```

The log never shows the API key, but it does show the full request URL.

## `--insecure`

Allows a plain `http://` URL other than `localhost` and `127.0.0.1`. Without it:

```bash
8cli --url http://n8n.example.test wf list
```

```json
{
  "error": "Refusing to use an insecure (http://) URL \"http://n8n.example.test\" – the API key would be sent in plaintext. Use an https:// URL, or pass --insecure to override (not recommended).",
  "code": "ERR_WORKFLOW_LIST"
}
```

The error code is the code of the command you ran (here `ERR_WORKFLOW_LIST`). See
[security notes](security.md#plain-http-urls).

## `--version` and `--help`

```bash
8cli --version
```

```text
0.1.2
```

`--help` works at every level: `8cli --help`, `8cli wf --help`, `8cli wf save --help`. Help and
version go to stdout and exit with 0. Running `8cli` or a group such as `8cli wf` with no
subcommand prints the help to stderr and exits with 1.
