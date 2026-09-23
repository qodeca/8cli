# Folders

Folder commands use n8n's internal cookie-authenticated API. Configure `N8N_EMAIL` and
`N8N_PASSWORD`, or store them with `auth set-credentials`. `folder tree` returns a nested folder
array. `folder create <name> [--parent <name>]` returns `id`, `name`, and `parentId`; `folder delete
<name>` returns `deleted` with its `id` and `name`.

`folder move <workflow-name> --to <folder>` moves a workflow; use `--to "(root)"` to remove its
folder. It returns the workflow and target folder details. `folder sync [--dir <path>]` aligns local
workflow files with the n8n folder tree and returns `moved` and `created`. Community n8n is
license-gated for this group. Errors include `ERR_NO_CREDENTIALS`, `ERR_FOLDER_TREE`,
`ERR_FOLDER_CREATE`, `ERR_FOLDER_DELETE`, `ERR_FOLDER_MOVE`, `ERR_FOLDER_SYNC`,
`ERR_FOLDER_NOT_FOUND`, `ERR_WORKFLOW_NOT_FOUND`, and `ERR_DIR_NOT_FOUND`.
