# `folder` – workflow folders

Shows and changes the folders workflows live in, and mirrors them into your local workflow
files.

> **Uses n8n's internal API, with a password.** These commands log in the way the n8n web app
> does, with an email and password. Set `N8N_EMAIL` and
> `N8N_PASSWORD` (or, on macOS, `auth set-credentials`). The API key is not used. Read
> [folder commands and the internal API](../guides/folders.md) before you rely on them.

> **Needs a licensed n8n.** On the Community edition the login works, then n8n refuses every
> folder request with `Plan lacks license for this feature`. The success output on this page is
> taken from 8cli's source; it was not run for these docs. See
> [Community and Enterprise n8n](../community-vs-enterprise.md).

| Subcommand                        | What it does                                     |
| --------------------------------- | ------------------------------------------------ |
| [`folder tree`](#folder-tree)     | Show all folders as a tree                       |
| [`folder create`](#folder-create) | Create a folder                                  |
| [`folder delete`](#folder-delete) | Delete an empty folder                           |
| [`folder move`](#folder-move)     | Move a workflow into a folder                    |
| [`folder sync`](#folder-sync)     | Move local workflow files to match n8n's folders |

**Names, not IDs.** Folder commands find folders and workflows by **name**, ignoring upper and
lower case. If two folders share a name (for example in different parents), the first one n8n
lists is used.

**One project.** The commands work in your personal project only.

**Errors common to all:** `ERR_NO_CREDENTIALS` (no email or password), `ERR_NO_URL`, and the
command's own code when the login fails:

```json
{
  "error": "Wrong username or password. Do you have caps lock on?",
  "code": "ERR_FOLDER_TREE"
}
```

n8n allows 5 internal logins per minute per client. The next one is refused **at once** – the
command does not wait out the `Retry-After` – with the seconds n8n asked for:

```json
{
  "error": "n8n rate-limited the login (HTTP 429); retry after 60 seconds.",
  "code": "ERR_RATE_LIMITED",
  "retryAfter": 60
}
```

## folder tree

```text
8cli folder tree
```

No options.

**Output:** an array of root folders, each `{ id, name, parentId, children }`, where `children`
holds folders of the same shape and `parentId` is `null` at the root. Sorted by name at every
level. No folders: `[]`. With `--table`, an indented text tree instead:

```text
Finance/
  Invoices/
Marketing/
```

On Community:

```bash
8cli folder tree
```

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_TREE"
}
```

**Errors:** `ERR_FOLDER_TREE`.

## folder create

```text
8cli folder create <name> [--parent <name>]
```

| Option            | Required | Meaning                                                     |
| ----------------- | -------- | ----------------------------------------------------------- |
| `--parent <name>` | No       | Create inside the folder with this name; default: top level |

Honours `--dry`: prints
`{ "dryRun": true, "id": null, "name": "<name>", "parentFolder": "<--parent, or null>" }`
and sends no request. The preview is built from the arguments, so it does not check that the
parent folder exists: `id` is `null`, and the parent appears by its **name** (`parentFolder`),
not the `parentFolderId` the real run returns. Email, password and URL must still be
configured (`ERR_NO_CREDENTIALS`, `ERR_NO_URL`), but no login is sent.

**Output:** `{ id, name, parentFolderId }` – `parentFolderId` is `null` for a top-level folder.

On Community (`8cli folder create Invoices --parent Finance`):

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_CREATE"
}
```

**Errors:** `ERR_FOLDER_NOT_FOUND` (no folder named as `--parent`), `ERR_FOLDER_CREATE`.

## folder delete

Deletes a folder. The command is meant for empty folders: move the workflows out first.

```text
8cli folder delete <name>
```

No options. Honours `--dry`: prints
`{ "dryRun": true, "deleted": { "id": null, "name": "<name>" } }` and sends no request, so it
does not check that the folder exists. Email, password and URL must still be
configured (`ERR_NO_CREDENTIALS`, `ERR_NO_URL`), but no login is sent.

**Output:** `{ deleted: { id, name } }`.

On Community (`8cli folder delete Finance`):

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_DELETE"
}
```

**Errors:** `ERR_FOLDER_NOT_FOUND`, `ERR_FOLDER_DELETE`.

## folder move

Moves a workflow, found by its name, into a folder.

```text
8cli folder move <workflow-name> --to <folder>
```

| Option          | Required | Meaning                                                             |
| --------------- | -------- | ------------------------------------------------------------------- |
| `--to <folder>` | Yes      | Name of the target folder, or `(root)` to take it out of any folder |

Honours `--dry`: prints
`{ "dryRun": true, "moved": { "workflowId": null, "workflowName": "<name>", "toFolder": "<--to value>" } }`
and sends no request. The preview does not check that the workflow or the target folder exists,
so `workflowId` is `null`. Email, password and URL must still be configured (`ERR_NO_CREDENTIALS`,
`ERR_NO_URL`), but no login is sent. Quote names with spaces.

**Output:** `{ moved: { workflowId, workflowName, toFolder } }` – `toFolder` is the `--to` value
as you typed it.

On Community, with a folder name:

```bash
8cli folder move 'New order webhook' --to Finance
```

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_MOVE"
}
```

With `--to '(root)'` 8cli skips the folder lookup and sends n8n's root marker (`"0"`), which n8n
accepts on Community too. Before 8cli 0.2.0 this failed with `Expected string, received null`.
On Community this was checked with a workflow already at the root; taking a workflow out of a real
folder needs a licensed n8n and was not run for these docs.

```bash
8cli folder move 'New order webhook' --to '(root)'
```

```json
{
  "moved": {
    "workflowId": "<id>",
    "workflowName": "New order webhook",
    "toFolder": "(root)"
  }
}
```

**Errors:** `ERR_WORKFLOW_NOT_FOUND` (no workflow with that name), `ERR_FOLDER_NOT_FOUND`,
`ERR_FOLDER_MOVE`.

```json
{
  "error": "Workflow 'No such workflow' not found",
  "code": "ERR_WORKFLOW_NOT_FOUND"
}
```

## folder sync

Moves your **local** workflow files into subfolders that match the folders in n8n. It changes
nothing in n8n. A file is matched to its workflow by the ID at the start of its file name
(`<id>_…json`, as `wf save` writes it); files without that pattern are left alone, and workflows
without a local file are skipped. Empty directories left behind are removed.

```text
8cli folder sync [--dir <path>]
```

| Option         | Required | Meaning                                       |
| -------------- | -------- | --------------------------------------------- |
| `--dir <path>` | No       | Workflow files folder; default: `workflowDir` |

Honours `--dry`: reports the moves and changes nothing. Unlike `folder create`, `folder delete` and `folder move`, its
preview reads n8n's folder and workflow lists to compute the target paths, so it does make
requests.

For example, after `wf save`:

```text
workflow-files/
  Jr53yjULv3JYJRgF_Daily sales report.json
```

If that workflow is in the n8n folder `Finance/Reports`, after `folder sync`:

```text
workflow-files/
  Finance/
    Reports/
      Jr53yjULv3JYJRgF_Daily sales report.json
```

**Output:** `{ dry, moved, created }`:

- `dry`: `true` with `--dry`, otherwise `false`.
- `moved`: an array of `{ from, to }`, paths relative to the folder.
- `created`: directories it created (or would create), relative to the folder.

When nothing needs to move, the output is `{ "moved": [], "created": [] }`, without `dry`.

On Community:

```bash
8cli folder sync
```

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_SYNC"
}
```

**Errors:** `ERR_DIR_NOT_FOUND` (the folder does not exist – checked after the login),
`ERR_FOLDER_SYNC`.

```json
{
  "error": "Workflow directory not found: /work/missing-dir",
  "code": "ERR_DIR_NOT_FOUND"
}
```

> **Note:** `wf publish` and `wf diff` only look at the top level of the workflow folder. After a
> `folder sync` has moved files into subfolders, point them at a file with `wf publish --file` or
> `wf diff --dir`.
