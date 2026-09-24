# Troubleshooting and FAQ

Find your error code or symptom below. Every error 8cli writes is JSON on stderr with a `code`;
the full list is on [output, errors and exit codes](output-and-errors.md).

## Connection and configuration

### `ERR_NO_URL`, `ERR_NO_API_KEY` or `ERR_NO_CONFIG`

8cli found no n8n URL or no API key. Which code you see depends on the command group; the fix is
the same. Set both:

```bash
export N8N_URL=https://n8n.example.com
```

```bash
read -rs N8N_API_KEY && export N8N_API_KEY
```

```bash
8cli auth verify
```

The silent `read` keeps the key out of terminal output and shell history.

Then run `8cli config show` to see what 8cli resolved. If you rely on a `8cli.json`, check you
are running 8cli from the folder that contains it (or `configs/8cli.json`), or pass `--config`.

### `"authenticated": false` with `"statusCode": 401`

n8n rejected the key. Create a new key in n8n (**Settings → n8n API**) and check you are
pointing at the right instance: a key from staging does not work on production.

If you did not pass a key and `N8N_API_KEY` is unset, 8cli may be using an old key from the macOS
keychain stored for that URL. Replace it with `auth set-api-key` or remove it with
`auth logout`.

### `Unauthorized` after `--api-key -`

`--api-key -` reads the key from standard input only for `auth login`. On every other command
8cli sends `-` itself as the key. Use `N8N_API_KEY` instead.

### `Refusing to use an insecure (http://) URL`

8cli will not send your API key over plain HTTP. Use `https://`. For n8n on your own machine,
`http://localhost` and `http://127.0.0.1` work without any flag. For other plain-HTTP URLs on a
trusted network, add `--insecure`. `http://[::1]` is refused in 8cli 0.1.2; use
`http://127.0.0.1` instead. See [security notes](security.md#plain-http-urls).

### `fetch failed`

8cli could not reach n8n at all: wrong host or port, n8n is down, DNS, a proxy or a firewall.
Check the URL with `curl -I "$N8N_URL"`.

### `Secret storage via the keychain is not yet implemented on Linux`

The keychain works only on macOS for now. On Linux and Windows, use `N8N_URL`, `N8N_API_KEY`
and, for folder commands, `N8N_EMAIL` and `N8N_PASSWORD`.

### `8cli.json` seems to be ignored

8cli skips a config file that is not valid JSON, without a warning. Run `8cli config show`: if
`workflowDir` is still `workflow-files`, the file was not read. Validate it with
`jq . 8cli.json`.

## Workflows

### `wf publish` says `ERR_NO_FILES`

`wf publish` reads only from `workflowDir` (default `workflow-files`) – it has no `--dir`
option. If you saved with `wf save --dir something-else`, publish does not look there. Either set
`"workflowDir": "something-else"` in `8cli.json`, or publish a single file with
`--file <path>`. See [the workflow lifecycle guide](guides/workflow-lifecycle.md).

### `wf publish` exits with 0 but nothing changed

Look at the `errors` array in the output. A file that n8n rejects is listed there and the exit
code is still 0:

```json
{
  "updated": [],
  "created": [],
  "errors": [
    {
      "file": "bad.json",
      "error": "request/body/nodes Expected array, received string"
    }
  ]
}
```

### `wf diff` shows changes right after `wf publish`

n8n rewrites a workflow when it stores it: it bumps `versionId` and `versionCounter` and may
reorder keys. Run `wf save --id <id>` after a publish, and the next `wf diff` compares like with
like.

### `wf activate` fails

n8n only activates a workflow that has a trigger node it can start (a schedule, webhook, app or
polling trigger). A workflow with only a manual trigger is refused:

```json
{
  "error": "Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.",
  "code": "ERR_WORKFLOW_ACTIVATE"
}
```

## Executions and data tables

### I get `ERR_HTTP_404` instead of `ERR_EXECUTION_GET`

That is expected: `exec` and `dt` pass n8n's HTTP error through as `ERR_HTTP_<status>`. See
[where an error code comes from](output-and-errors.md#where-an-error-code-comes-from).

### `exec list --status` returns `ERR_HTTP_400`

The status must be one of n8n's values: `canceled`, `crashed`, `error`, `new`, `running`,
`success`, `unknown`, `waiting`.

## Licensed features

### `Your license does not allow for feat:…`, `Plan lacks license for this feature`, or `not found` from `sc status`

Your n8n is the Community edition. Variables, projects, folders and source control need a
licensed n8n. See [Community and Enterprise n8n](community-vs-enterprise.md).

## Folders

### `ERR_NO_CREDENTIALS`

Folder commands need an n8n user's email and password, not the API key. Set `N8N_EMAIL` and
`N8N_PASSWORD`, or on macOS store them with `auth set-credentials`. See
[folder commands and the internal API](guides/folders.md).

### `Wrong username or password. Do you have caps lock on?`

n8n rejected the email or password for the internal login. The error code is the folder
command's own (for example `ERR_FOLDER_TREE`).

## FAQ

**Does 8cli work on Windows and Linux?** Yes, with environment variables. Only the keychain
storage in `auth` is macOS-only for now.

**Which n8n versions does it support?** These docs were checked against n8n 2.40.5. 8cli uses
n8n's public REST API (`/api/v1`) and, for folders, n8n's internal API, which n8n can change
without notice.

**Can 8cli run a workflow?** No. n8n's public API has no "run" endpoint. Trigger a workflow the
way it is built to start, for example by calling its webhook URL.

**Can 8cli push to source control?** No. `sc push` always returns `ERR_NOT_SUPPORTED`, because
n8n's public API has no push. Use the n8n UI.

**How do I see exactly what 8cli sends?** Add `--verbose`. Each request is logged to stderr.
