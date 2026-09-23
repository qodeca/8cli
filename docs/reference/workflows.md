# Workflows

`wf list` returns objects with `id`, `name`, `active`, and `updatedAt`; `wf get <id>` returns the
full n8n workflow. `wf save [--id <id>] [--dir <path>]` writes JSON files and returns `files`, or
`dryRun` and `files` with `--dry`. `wf publish [--id <id>] [--file <path>]` returns `updated`,
`created`, `errors`, and optionally `dryRun`. It strips fields n8n rejects before publishing.

`wf activate <id>`, `wf deactivate <id>`, and `wf delete <id>` return the affected `id`; the first
two also return `name` and `active`, while delete returns `deleted` (or `dryRun` and `deleted:false`).
`wf diff <id> [--dir <path>]` compares a saved file with n8n. Errors include `ERR_WORKFLOW_LIST`,
`ERR_WORKFLOW_GET`, `ERR_WORKFLOW_SAVE`, `ERR_WORKFLOW_PUBLISH`, `ERR_WORKFLOW_ACTIVATE`,
`ERR_WORKFLOW_DEACTIVATE`, `ERR_WORKFLOW_DELETE`, `ERR_WORKFLOW_DIFF`, `ERR_NO_FILES`, and
`ERR_NO_LOCAL_FILE`.
