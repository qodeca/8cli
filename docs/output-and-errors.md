# Output, errors and exit codes

8cli is built to be read by programs. This page is the contract: what goes to stdout, what goes
to stderr, which exit code you get, every error code, and the few places where the rule bends.

## The rule

| Situation | stdout                | stderr                              | Exit code |
| --------- | --------------------- | ----------------------------------- | --------- |
| Success   | JSON (pretty-printed) | nothing (or `--verbose` log lines)  | `0`       |
| Failure   | nothing               | `{ "error": "…", "code": "ERR_…" }` | `1`       |

- **List commands print an array**, even when it is empty (`[]`).
- **Get commands print one object.**
- **Write commands print what they did**, for example `{ "id": "…", "deleted": true }` or
  `{ "files": [...] }`.
- **No command ever asks a question.** Everything comes from flags, arguments, environment
  variables or files.

A failure looks like this:

```bash
8cli wf get doesNotExist0001
```

stderr, exit code 1:

```json
{
  "error": "Not Found",
  "code": "ERR_WORKFLOW_GET"
}
```

In a script, test the exit code, then read `code` – it is stable; the `error` text is for
people and can change.

```bash
if ! out=$(8cli wf get "$ID" 2>err.json); then
  echo "failed: $(jq -r .code err.json)"
fi
```

## Exceptions to the rule

A few commands do not follow the rule exactly. An agent or script should know them.

| Command                                | What it does instead                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `wf diff` when files differ            | Prints a **plain-text unified diff** to stdout (not JSON), exit code `0`.                       |
| `wf diff` when files match             | Prints `{ "id", "diff": null, "message": "No differences found" }`, exit code `0`.              |
| `auth verify` when n8n rejects the key | Prints `{ "url", "authenticated": false, "error", "statusCode" }` to **stdout**, exit code `1`. |
| `wf publish` when a file fails         | Lists the failure in the `errors` array on stdout, **exit code `0`**. Check `errors` yourself.  |
| `folder tree --table`                  | Prints an indented plain-text tree.                                                             |
| Any command with `--table`             | Prints a text table for list results.                                                           |
| `--help`, `--version`                  | Plain text to stdout, exit code `0`.                                                            |
| Usage mistakes                         | Plain text to stderr, exit code `1` – see below.                                                |

### Usage mistakes

A missing required option, an unknown option or an unknown command is caught before 8cli runs,
and the message is plain text, not JSON:

```bash
8cli tag update slPdPQIChDRrKCsR
```

```text
error: required option '--name <name>' not specified
```

```bash
8cli wf list --limit 5
```

```text
error: unknown option '--limit'
```

```bash
8cli tags list
```

```text
error: unknown command 'tags'
(Did you mean tag?)
```

All three go to stderr with exit code 1. If stderr does not start with `{`, it is a usage
mistake: check the command against `--help`.

## Exit codes

| Code | Meaning                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | The command worked. (For `wf publish`, also check the `errors` array.)                                                                   |
| `1`  | Anything went wrong: bad input, missing configuration, n8n refused, network down, usage mistake, or `auth verify` found the key invalid. |

There are no other exit codes. `wf diff` exits with `0` whether or not it found differences.

## Where an error code comes from

Most commands use **one code per command** for anything that goes wrong, including n8n's own
refusals: `wf get` fails with `ERR_WORKFLOW_GET` whether the workflow does not exist, the key is
wrong, or the network is down. The `error` text tells them apart.

Two groups differ: **`exec` and `dt` pass n8n's HTTP error through**. When n8n answers with an
error, the code is `ERR_HTTP_<status>` (for example `ERR_HTTP_404`), or n8n's own error code
when it sends one. Their command code (`ERR_EXECUTION_GET`, `ERR_DATATABLE_ROWS`, …) appears
only for failures that never reached n8n, such as a network error or a refused `http://` URL.

```bash
8cli exec get 99999
```

```json
{
  "error": "Not Found",
  "code": "ERR_HTTP_404"
}
```

A network failure reports n8n's HTTP client message and the command's code:

```bash
8cli --url https://localhost:1 wf list
```

```json
{
  "error": "fetch failed",
  "code": "ERR_WORKFLOW_LIST"
}
```

## All error codes

### Missing configuration

Which code you get when the URL, key or password is missing depends on the command group.

| Code                 | Meaning                                   | Returned by                                           |
| -------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `ERR_NO_URL`         | No n8n URL was found                      | `auth` (all but `list`), `wf`, `exec`, `dt`, `folder` |
| `ERR_NO_API_KEY`     | No API key was found                      | `auth login`, `auth verify`, `wf`, `exec`, `dt`       |
| `ERR_NO_CONFIG`      | The URL or the API key is missing         | `cred`, `tag`, `var`, `proj`, `user`, `audit`, `sc`   |
| `ERR_NO_CREDENTIALS` | No email or password for the internal API | `folder` (checked before the URL)                     |

```bash
8cli tag list        # with N8N_URL and N8N_API_KEY unset
```

```json
{
  "error": "No n8n URL or API key configured. Use --url/--api-key flags, env vars, or `auth login`.",
  "code": "ERR_NO_CONFIG"
}
```

### Per command group

| Group    | Codes                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`   | `ERR_AUTH_LOGIN`, `ERR_AUTH_LOGOUT`, `ERR_AUTH_LIST`, `ERR_AUTH_VERIFY`, `ERR_AUTH_SET_API_KEY`, `ERR_AUTH_SET_CREDENTIALS`                                                                                                                             |
| `config` | `ERR_CONFIG`                                                                                                                                                                                                                                            |
| `wf`     | `ERR_WORKFLOW_LIST`, `ERR_WORKFLOW_GET`, `ERR_WORKFLOW_SAVE`, `ERR_WORKFLOW_PUBLISH`, `ERR_WORKFLOW_ACTIVATE`, `ERR_WORKFLOW_DEACTIVATE`, `ERR_WORKFLOW_DELETE`, `ERR_WORKFLOW_DIFF`, `ERR_NO_FILES`, `ERR_NO_LOCAL_FILE`                               |
| `exec`   | `ERR_HTTP_<status>` or n8n's code; `ERR_EXECUTION_LIST`, `ERR_EXECUTION_GET`, `ERR_EXECUTION_DELETE`                                                                                                                                                    |
| `cred`   | `ERR_CRED_LIST`, `ERR_CRED_DELETE`, `ERR_CRED_TRANSFER`                                                                                                                                                                                                 |
| `tag`    | `ERR_TAG_LIST`, `ERR_TAG_CREATE`, `ERR_TAG_UPDATE`, `ERR_TAG_DELETE`                                                                                                                                                                                    |
| `var`    | `ERR_VARIABLE_LIST`, `ERR_VARIABLE_SET`, `ERR_VARIABLE_DELETE`, `ERR_VARIABLE_NOT_FOUND`                                                                                                                                                                |
| `proj`   | `ERR_PROJECT_LIST`, `ERR_PROJECT_CREATE`, `ERR_PROJECT_UPDATE`, `ERR_PROJECT_DELETE`                                                                                                                                                                    |
| `user`   | `ERR_USER_LIST`, `ERR_USER_GET`                                                                                                                                                                                                                         |
| `folder` | `ERR_FOLDER_TREE`, `ERR_FOLDER_CREATE`, `ERR_FOLDER_DELETE`, `ERR_FOLDER_MOVE`, `ERR_FOLDER_SYNC`, `ERR_FOLDER_NOT_FOUND`, `ERR_WORKFLOW_NOT_FOUND`, `ERR_DIR_NOT_FOUND`                                                                                |
| `dt`     | `ERR_HTTP_<status>` or n8n's code; `ERR_DATATABLE_LIST`, `ERR_DATATABLE_GET`, `ERR_DATATABLE_ROWS`, `ERR_DATATABLE_CREATE`, `ERR_DATATABLE_DELETE`, `ERR_DATATABLE_INSERT`, `ERR_INVALID_JSON`, `ERR_MISSING_DATA`, `ERR_FILE_READ`, `ERR_INVALID_DATA` |
| `audit`  | `ERR_AUDIT`                                                                                                                                                                                                                                             |
| `sc`     | `ERR_SOURCE_CONTROL`, `ERR_NOT_SUPPORTED`                                                                                                                                                                                                               |

Each command's page in the [command reference](reference/README.md) says which of these it
returns and when.

### Specific codes

| Code                     | When                                                               |
| ------------------------ | ------------------------------------------------------------------ |
| `ERR_NO_FILES`           | `wf publish` found no workflow file to publish (see `workflowDir`) |
| `ERR_NO_LOCAL_FILE`      | `wf diff` found no local file with that workflow ID                |
| `ERR_VARIABLE_NOT_FOUND` | `var delete` found no variable with that key                       |
| `ERR_FOLDER_NOT_FOUND`   | A `folder` command could not find the named folder                 |
| `ERR_WORKFLOW_NOT_FOUND` | `folder move` could not find a workflow with that name             |
| `ERR_DIR_NOT_FOUND`      | `folder sync` was pointed at a directory that does not exist       |
| `ERR_INVALID_JSON`       | `dt create --columns` or `dt insert` row data is not valid JSON    |
| `ERR_INVALID_DATA`       | `dt insert` row data is JSON but not an array                      |
| `ERR_MISSING_DATA`       | `dt insert` got neither `--data` nor `--stdin`                     |
| `ERR_FILE_READ`          | `dt insert --data @file` could not read the file                   |
| `ERR_NOT_SUPPORTED`      | `sc push` – n8n's public API has no push                           |

## Related pages

- [Using 8cli from AI agents](guides/ai-agents.md) – how an agent should read this contract.
- [Troubleshooting and FAQ](troubleshooting.md) – fixes for the common codes.
