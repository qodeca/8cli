# Back up, diff and publish workflows

This guide keeps your n8n workflows as JSON files in a Git repository: back them up, see what
changed, edit them, and send the changes back to n8n. Every step below was run in one session
against a local n8n; the outputs are real.

## 1. Pick one folder and write it down

`wf save` and `wf diff` accept `--dir`, but **`wf publish` does not** – it always reads from
`workflowDir`. So set the folder once, in a `8cli.json` at the root of your repository, and leave
`--dir` out of every command:

```json
{
  "workflowDir": "workflows"
}
```

Check it:

```bash
8cli config show | jq -c '{url, workflowDir}'
```

```text
{"url":"http://localhost:5678","workflowDir":"workflows"}
```

Without a `8cli.json` the folder is `workflow-files`. Run every command from the folder that holds
`8cli.json`, because the path is relative to the current directory.

## 2. Back up every workflow

```bash
8cli wf save
```

```json
{
  "files": [
    "/work/workflows/BQLsNfoyvbhwTPTP_New order webhook.json",
    "/work/workflows/Jr53yjULv3JYJRgF_Daily sales report.json",
    "/work/workflows/h7WdtiYbnI8jPk1M_Sync CRM contacts.json",
    "/work/workflows/qGfEkzEK64bJll67_Invoice reminder.json",
    "/work/workflows/x7Mn2vO5DDjRZYfD_New lead to Slack.json"
  ]
}
```

Each file is named `<id>_<name>.json` and holds the full workflow. Check exported files for
embedded secrets before committing; use a private backup repository and review contents before
publication. Then commit them:

```bash
git add workflows && git commit -m "Back up n8n workflows"
```

Run `wf save` again at any time; it overwrites the files, and `git diff` shows what changed in
n8n since the last backup. A workflow deleted in n8n keeps its old file – remove it yourself.

## 3. Edit a workflow and see the difference

Here the second node of "New order webhook" is renamed from "Do nothing" to "Store order" in the
local file. Compare it with n8n:

```bash
8cli wf diff BQLsNfoyvbhwTPTP
```

When there is a difference, the output is a unified diff – **plain text, not JSON**. `-` lines
are your file, `+` lines are n8n:

```diff
===================================================================
--- local/BQLsNfoyvbhwTPTP_New order webhook.json	local
+++ remote/BQLsNfoyvbhwTPTP	remote
@@ -26,9 +26,9 @@
       },
       "id": "de1e35d1-c82d-4a74-87a3-f07df0f7f608"
     },
     {
-      "name": "Store order",
+      "name": "Do nothing",
       "type": "n8n-nodes-base.noOp",
       "typeVersion": 1,
       "position": [
         220,
@@ -42,9 +42,9 @@
     "Webhook": {
       "main": [
         [
           {
-            "node": "Store order",
+            "node": "Do nothing",
             "type": "main",
             "index": 0
           }
         ]
```

The exit code is 0 whether or not there is a difference.

## 4. Preview, then publish

Preview first with `--dry`:

```bash
8cli --dry wf publish --id BQLsNfoyvbhwTPTP
```

```json
{
  "updated": [
    {
      "id": "BQLsNfoyvbhwTPTP",
      "name": "New order webhook"
    }
  ],
  "created": [],
  "errors": [],
  "dryRun": true
}
```

Then publish:

```bash
8cli wf publish --id BQLsNfoyvbhwTPTP
```

```json
{
  "updated": [
    {
      "id": "BQLsNfoyvbhwTPTP",
      "name": "New order webhook"
    }
  ],
  "created": [],
  "errors": []
}
```

Without `--id`, `wf publish` sends **every** file in the folder. **Always read `errors`**: a file
n8n rejects is listed there and the exit code is still 0.

What publish sends: the name, nodes, connections, static data and the `executionOrder` setting.
It does not change whether the workflow is active, and it does not send tags or other settings.

## 5. Save again after publishing

n8n stores a new version when you publish (new `versionId`, higher `versionCounter`) and may
reorder fields, so right after a publish `wf diff` shows those changes even though your edit went
through. Save the workflow again so your file matches n8n:

```bash
8cli wf save --id BQLsNfoyvbhwTPTP
```

```json
{
  "files": ["/work/workflows/BQLsNfoyvbhwTPTP_New order webhook.json"]
}
```

```bash
8cli wf diff BQLsNfoyvbhwTPTP
```

```json
{
  "id": "BQLsNfoyvbhwTPTP",
  "diff": null,
  "message": "No differences found"
}
```

Commit the file.

## Adding a new workflow from a file

A file whose `id` does not exist in n8n is **created** as a new workflow, and n8n gives it a new
ID. The file still needs an `id` field – any placeholder works. "New order webhook" above started
as this draft, kept outside the `workflows` folder:

```json
{
  "id": "draftNewOrder001",
  "name": "New order webhook",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "webhookId": "5f0c7a52-3a57-4f0e-9d1a-6c2b8e1f4d30",
      "parameters": { "path": "new-order", "httpMethod": "POST", "responseMode": "onReceived" }
    },
    {
      "name": "Do nothing",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [220, 0],
      "parameters": {}
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Do nothing", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

```bash
8cli wf publish --file drafts/new-order-webhook.json
```

```json
{
  "updated": [],
  "created": [
    {
      "id": "BQLsNfoyvbhwTPTP",
      "name": "New order webhook"
    }
  ],
  "errors": []
}
```

8cli does not rename or update your draft. Run `wf save --id <new id>` to get the file under its
real ID, and do not publish the draft again – each publish of a file whose `id` is not in n8n
creates another copy.

## Moving workflows between instances

Save from one instance and publish to another with `--url`:

```bash
8cli --url https://staging.n8n.example.com wf save
8cli --url https://n8n.example.com --dry wf publish
```

Workflow IDs differ between instances, so on the second instance every file is **created**, not
updated. Credentials are not copied; connect them in n8n afterwards. (These two commands need two
instances and were not run for this guide.)

## Common problems

- **`ERR_NO_FILES`** – publish looked in `workflowDir` and found nothing. Check
  `8cli config show` and step 1.
- **`ERR_NO_LOCAL_FILE`** from `wf diff` – no file in the folder has that `id`.
- **Publish created a duplicate** – a file's `id` did not match the workflow in n8n. Delete the
  duplicate with `wf delete` and save the original again.

See also: [`wf` reference](../reference/workflow.md), [using 8cli in CI](ci.md), and
[`folder sync`](../reference/folder.md#folder-sync) to mirror n8n's folders on disk.
