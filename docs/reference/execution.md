# `execution` (`exec`) – workflow runs

Lists, reads and deletes executions – the record n8n keeps each time a workflow runs. 8cli cannot
start a run; n8n's public API has no endpoint for it.

| Subcommand                    | What it does           |
| ----------------------------- | ---------------------- |
| [`exec list`](#exec-list)     | List recent executions |
| [`exec get`](#exec-get)       | Print one execution    |
| [`exec delete`](#exec-delete) | Delete one execution   |

**Error codes work differently here.** When n8n answers with an error, `exec` passes it through
as `ERR_HTTP_<status>` (for example `ERR_HTTP_404`), or n8n's own code if it sends one. The
`ERR_EXECUTION_*` codes appear only when the request never got an answer, for example
`fetch failed` or a refused `http://` URL. See
[where an error code comes from](../output-and-errors.md#where-an-error-code-comes-from).

## exec list

Lists executions, newest first. Unlike other list commands it makes **one** request and returns
at most `--limit` results; it does not page through everything.

```text
8cli exec list [--workflow <id>] [--status <status>] [--limit <n>]
```

| Option              | Required | Default | Meaning                                      |
| ------------------- | -------- | ------- | -------------------------------------------- |
| `--workflow <id>`   | No       |         | Only executions of this workflow             |
| `--status <status>` | No       |         | Only executions with this status (see below) |
| `--limit <n>`       | No       | `20`    | At most this many executions                 |

`--status` takes n8n's values: `canceled`, `crashed`, `error`, `new`, `running`, `success`,
`unknown`, `waiting`. Any other value is refused by n8n with `ERR_HTTP_400`.

```bash
8cli exec list --workflow BQLsNfoyvbhwTPTP --limit 5
```

```json
[
  {
    "id": "7",
    "finished": true,
    "mode": "webhook",
    "retryOf": null,
    "retrySuccessId": null,
    "status": "success",
    "startedAt": "2026-09-23T22:24:32.381Z",
    "stoppedAt": "2026-09-23T22:24:32.386Z",
    "workflowId": "BQLsNfoyvbhwTPTP",
    "waitTill": null
  },
  {
    "id": "6",
    "finished": true,
    "mode": "webhook",
    "retryOf": null,
    "retrySuccessId": null,
    "status": "success",
    "startedAt": "2026-09-23T22:24:25.437Z",
    "stoppedAt": "2026-09-23T22:24:25.443Z",
    "workflowId": "BQLsNfoyvbhwTPTP",
    "waitTill": null
  }
]
```

With `--table` (run when only one execution existed):

```text
┌────────┬──────────┬──────────┬────────────────────────┬────────────────────────┐
│ ID     │ Workflow │ Status   │ Started at             │ Stopped at             │
├────────┼──────────┼──────────┼────────────────────────┼────────────────────────┤
│ 6      │ BQLsNfo… │ success  │ 2026-09-23T22:24:25.4… │ 2026-09-23T22:24:25.4… │
└────────┴──────────┴──────────┴────────────────────────┴────────────────────────┘
```

**Output:** an array of n8n's execution summaries, passed through: `id`, `finished`, `mode`,
`retryOf`, `retrySuccessId`, `status`, `startedAt`, `stoppedAt`, `workflowId`, `waitTill`. The
`id` is a number written as a string.

**Errors:** `ERR_HTTP_<status>` from n8n, for example:

```json
{
  "error": "request/query/status Invalid enum value. Expected 'canceled' | 'crashed' | 'error' | 'new' | 'running' | 'success' | 'unknown' | 'waiting', received 'finished'",
  "code": "ERR_HTTP_400"
}
```

`ERR_EXECUTION_LIST` when n8n could not be reached.

## exec get

Prints one execution. Add `--data` for everything each node received and produced.

```text
8cli exec get <id> [--data]
```

| Option   | Required | Meaning                                                          |
| -------- | -------- | ---------------------------------------------------------------- |
| `--data` | No       | Include the full run data (`data`, `workflowData`, `customData`) |

```bash
8cli exec get 6
```

```json
{
  "id": "6",
  "finished": true,
  "mode": "webhook",
  "retryOf": null,
  "retrySuccessId": null,
  "status": "success",
  "createdAt": "2026-09-23T22:24:25.432Z",
  "startedAt": "2026-09-23T22:24:25.437Z",
  "stoppedAt": "2026-09-23T22:24:25.443Z",
  "deletedAt": null,
  "workflowId": "BQLsNfoyvbhwTPTP",
  "waitTill": null,
  "storedAt": "db",
  "tracingContext": null,
  "deduplicationKey": null,
  "jsonSizeBytes": 2177,
  "binaryDataSizeBytes": 0,
  "workflowVersionId": "601c8cd7-9d08-4751-8ac4-9f3a6df2da9e",
  "usedPrivateCredentials": false
}
```

With `--data` the output is much larger. To pull out the payload a webhook received:

```bash
8cli exec get 6 --data | jq -c '.data.resultData.runData.Webhook[0].data.main[0][0].json.body'
```

```text
{"orderId":"A-1002","total":19.9}
```

**Output:** n8n's execution object, passed through. Without `--data` it has the fields above.
With `--data` it also has `data` (with `resultData.runData`, one entry per node),
`workflowData` and `customData`.

Execution data can contain personal or business data from the run; handle it with care.

**Errors:** `ERR_HTTP_404` when there is no such execution; `ERR_EXECUTION_GET` when n8n could not
be reached.

```bash
8cli exec get 7
```

```json
{
  "error": "Not Found",
  "code": "ERR_HTTP_404"
}
```

## exec delete

Deletes one execution.

```text
8cli exec delete <id>
```

No options. Ignores `--dry`.

```bash
8cli exec delete 7
```

```json
{
  "id": "7",
  "deleted": true
}
```

**Output:** `{ id, deleted: true }`.

**Errors:** `ERR_HTTP_404` when there is no such execution (for example, it is already deleted);
`ERR_EXECUTION_DELETE` when n8n could not be reached.
