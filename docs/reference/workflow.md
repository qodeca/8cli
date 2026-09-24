# `workflow` (`wf`) – workflows

Lists, reads, backs up, compares, publishes, activates and deletes n8n workflows through the
public API. For a step-by-step backup and publish flow, see
[back up, diff and publish workflows](../guides/workflow-lifecycle.md).

| Subcommand                        | What it does                                  |
| --------------------------------- | --------------------------------------------- |
| [`wf list`](#wf-list)             | List all workflows (summary fields)           |
| [`wf get`](#wf-get)               | Print one workflow's full JSON                |
| [`wf save`](#wf-save)             | Write workflows to local JSON files           |
| [`wf publish`](#wf-publish)       | Create or update workflows from local files   |
| [`wf activate`](#wf-activate)     | Turn a workflow on                            |
| [`wf deactivate`](#wf-deactivate) | Turn a workflow off                           |
| [`wf delete`](#wf-delete)         | Delete a workflow                             |
| [`wf diff`](#wf-diff)             | Compare a local file with the workflow in n8n |

## Workflow files

`wf save`, `wf publish`, `wf diff` and `folder sync` share one folder of workflow files:

- **Folder:** `workflowDir` from [`8cli.json`](../configuration.md#the-config-file-8clijson),
  default `workflow-files`, relative to the current directory. `wf save` and `wf diff` can
  override it with `--dir`; **`wf publish` cannot** – it always uses `workflowDir` (or one
  `--file`).
- **File name:** `<id>_<name>.json`, for example `Jr53yjULv3JYJRgF_Daily sales report.json`.
  The characters `/ \ : * ? " < > |` in the name become `-`.
- **Content:** the workflow exactly as `wf get` returns it, pretty-printed. The `id` field inside
  the file is what `wf publish` and `wf diff` match on, not the file name.

## wf list

Lists every workflow, all pages included.

```text
8cli wf list
```

No options.

```bash
8cli wf list
```

```json
[
  {
    "id": "Jr53yjULv3JYJRgF",
    "name": "Daily sales report",
    "active": false,
    "updatedAt": "2026-09-23T21:41:31.336Z"
  },
  {
    "id": "h7WdtiYbnI8jPk1M",
    "name": "Sync CRM contacts",
    "active": false,
    "updatedAt": "2026-09-23T21:41:31.366Z"
  }
]
```

(Trimmed to two workflows.)

**Output:** an array of `{ id, name, active, updatedAt }`. With `--table`, columns are ID, Name,
Active and Updated, and long values are cut short.

**Errors:** `ERR_WORKFLOW_LIST`.

## wf get

Prints one workflow's full JSON, as n8n returns it.

```text
8cli wf get <id>
```

No options.

```bash
8cli wf get Jr53yjULv3JYJRgF
```

```json
{
  "id": "Jr53yjULv3JYJRgF",
  "name": "Daily sales report",
  "description": null,
  "active": false,
  "createdAt": "2026-09-23T21:41:31.336Z",
  "updatedAt": "2026-09-23T21:41:31.336Z",
  "versionId": "83854a96-df64-486f-a9cd-985e23b76077",
  "nodes": [
    {
      "name": "Schedule trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 0],
      "parameters": { "rule": { "interval": [{ "field": "days" }] } },
      "id": "1b1c8b2e-435d-402d-9325-8aca2c23e9c1"
    },
    …
  ],
  "connections": { "Schedule trigger": { "main": [[{ "node": "Do nothing", "type": "main", "index": 0 }]] } },
  "settings": { "executionOrder": "v1" },
  "staticData": null,
  "tags": [],
  "shared": [ … ]
}
```

(Trimmed and compacted.)

**Output:** n8n's workflow object, passed through. On n8n 2.40.5 its top-level fields are
`active`, `activeVersion`, `activeVersionId`, `connections`, `createdAt`, `description`, `id`,
`isArchived`, `meta`, `name`, `nodeGroups`, `nodes`, `pinData`, `settings`, `shared`,
`sourceWorkflowId`, `staticData`, `tags`, `triggerCount`, `updatedAt`, `versionCounter`,
`versionId`.

**Errors:** `ERR_WORKFLOW_GET` (for example `Not Found`).

## wf save

Downloads workflows and writes each one to `<id>_<name>.json`. Creates the folder if needed and
overwrites files that already exist.

```text
8cli wf save [--id <id>] [--dir <path>]
```

| Option         | Required | Meaning                                                   |
| -------------- | -------- | --------------------------------------------------------- |
| `--id <id>`    | No       | Save only this workflow. Without it, save every workflow. |
| `--dir <path>` | No       | Write here instead of `workflowDir`                       |

Honours `--dry`: lists the files it would write and writes nothing.

```bash
8cli wf save --id H1lrBYWCZUIi7zgE --dir backup
```

```json
{
  "files": ["/work/backup/H1lrBYWCZUIi7zgE_New order webhook.json"]
}
```

```bash
8cli --dry wf save
```

```json
{
  "dryRun": true,
  "files": [
    "/work/workflow-files/H1lrBYWCZUIi7zgE_New order webhook.json",
    "/work/workflow-files/Jr53yjULv3JYJRgF_Daily sales report.json",
    "/work/workflow-files/h7WdtiYbnI8jPk1M_Sync CRM contacts.json",
    "/work/workflow-files/qGfEkzEK64bJll67_Invoice reminder.json",
    "/work/workflow-files/x7Mn2vO5DDjRZYfD_New lead to Slack.json"
  ]
}
```

**Output:** `{ files }` – absolute paths of the files written; with `--dry`,
`{ dryRun: true, files }`.

**Errors:** `ERR_WORKFLOW_SAVE`.

## wf publish

Sends local workflow files to n8n. A file whose `id` matches an existing workflow **updates**
it; any other file **creates** a new workflow, and n8n gives it a new ID.

```text
8cli wf publish [--id <id>] [--file <path>]
```

| Option          | Required | Meaning                                                   |
| --------------- | -------- | --------------------------------------------------------- |
| `--id <id>`     | No       | Publish only the file in `workflowDir` whose `id` is this |
| `--file <path>` | No       | Publish this one file, from anywhere                      |

With neither option, it publishes every `.json` file in `workflowDir`. `--file` wins over `--id`.
There is no `--dir`: set `workflowDir` in `8cli.json` if your files live elsewhere.

What is sent: only `name`, `nodes`, `connections`, `staticData`, and `settings.executionOrder`.
Everything else in the file (`active`, `tags`, other settings, `id`, dates) is left out, because
n8n's API refuses it. Publishing does not activate or deactivate a workflow.

Honours `--dry`: reports what it would update and create, without sending anything.

```bash
8cli wf publish --file drafts/new-order-webhook.json
```

```json
{
  "updated": [],
  "created": [
    {
      "id": "H1lrBYWCZUIi7zgE",
      "name": "New order webhook"
    }
  ],
  "errors": []
}
```

```bash
8cli --dry wf publish --id H1lrBYWCZUIi7zgE
```

```json
{
  "updated": [
    {
      "id": "H1lrBYWCZUIi7zgE",
      "name": "New order webhook"
    }
  ],
  "created": [],
  "errors": [],
  "dryRun": true
}
```

In a dry run a created workflow shows `"id": null`, because only n8n can assign the ID.

**Output:** `{ updated, created, errors }`, plus `dryRun: true` with `--dry`.

- `updated` and `created`: arrays of `{ id, name }`.
- `errors`: an array of `{ file, error }`, one per file that failed. **The exit code is 0 even
  when `errors` is not empty** – check it.

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

**Errors:** `ERR_NO_FILES` (no file found to publish), `ERR_WORKFLOW_PUBLISH` (for example n8n is
unreachable).

```json
{
  "error": "No workflow files found to publish",
  "code": "ERR_NO_FILES"
}
```

## wf activate

Turns a workflow on, so its trigger starts listening.

```text
8cli wf activate <id>
```

No options. Ignores `--dry`.

```bash
8cli wf activate H1lrBYWCZUIi7zgE
```

```json
{
  "id": "H1lrBYWCZUIi7zgE",
  "name": "New order webhook",
  "active": true
}
```

**Output:** `{ id, name, active: true }`.

**Errors:** `ERR_WORKFLOW_ACTIVATE`. A workflow without a trigger node is refused:

```json
{
  "error": "Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.",
  "code": "ERR_WORKFLOW_ACTIVATE"
}
```

## wf deactivate

Turns a workflow off.

```text
8cli wf deactivate <id>
```

No options. Ignores `--dry`.

```bash
8cli wf deactivate H1lrBYWCZUIi7zgE
```

```json
{
  "id": "H1lrBYWCZUIi7zgE",
  "name": "New order webhook",
  "active": false
}
```

**Output:** `{ id, name, active: false }`.

**Errors:** `ERR_WORKFLOW_DEACTIVATE`.

## wf delete

Deletes a workflow from n8n. Its executions go with it. Local files are not touched.

```text
8cli wf delete <id>
```

No options. Honours `--dry`.

```bash
8cli --dry wf delete H1lrBYWCZUIi7zgE
```

```json
{
  "dryRun": true,
  "id": "H1lrBYWCZUIi7zgE",
  "deleted": false
}
```

```bash
8cli wf delete H1lrBYWCZUIi7zgE
```

```json
{
  "id": "H1lrBYWCZUIi7zgE",
  "deleted": true
}
```

**Output:** `{ id, deleted: true }`; with `--dry`, `{ dryRun: true, id, deleted: false }`. The
dry run does not check that the workflow exists.

**Errors:** `ERR_WORKFLOW_DELETE` (for example `Not Found`).

## wf diff

Compares the local file for a workflow with the workflow in n8n, ignoring `createdAt` and
`updatedAt`.

```text
8cli wf diff <id> [--dir <path>]
```

| Option         | Required | Meaning                                               |
| -------------- | -------- | ----------------------------------------------------- |
| `--dir <path>` | No       | Look for the local file here instead of `workflowDir` |

The local file is the first `.json` file in the folder whose `id` field is `<id>`.

When they match, you get JSON:

```bash
8cli wf diff H1lrBYWCZUIi7zgE
```

```json
{
  "id": "H1lrBYWCZUIi7zgE",
  "diff": null,
  "message": "No differences found"
}
```

When they differ, you get a **plain-text unified diff**, not JSON. Lines starting with `-` are
the local file, lines starting with `+` are n8n:

```diff
===================================================================
--- local/H1lrBYWCZUIi7zgE_New order webhook.json	local
+++ remote/H1lrBYWCZUIi7zgE	remote
@@ -26,9 +26,9 @@
       },
       "id": "3ec935c3-fe56-408e-9f7a-763d55c03583"
     },
     {
-      "name": "Store order",
+      "name": "Do nothing",
       "type": "n8n-nodes-base.noOp",
       "typeVersion": 1,
       "position": [
         220,
```

(Trimmed to the first change.)

**Output:** `{ id, diff: null, message }` when equal; unified diff text when not. **The exit code
is 0 in both cases.** To test for differences in a script, check whether the output starts with
`{`.

**Errors:** `ERR_NO_LOCAL_FILE` (no file with that `id` in the folder), `ERR_WORKFLOW_DIFF` (for
example the workflow is not in n8n).

```json
{
  "error": "No local file found for workflow Jr53yjULv3JYJRgF in /work/backup",
  "code": "ERR_NO_LOCAL_FILE"
}
```
