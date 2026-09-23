# Tags, variables, projects and users

`tag list`, `tag create <name>`, `tag update <id> --name <name>`, and `tag delete <id>` manage tags.
Writes return `id` and `name`, or `id` and `deleted`. Errors: `ERR_TAG_LIST`, `ERR_TAG_CREATE`,
`ERR_TAG_UPDATE`, `ERR_TAG_DELETE`.

`var list`, `var set <key> <value>`, and `var delete <key>` manage variables. Set returns `id`,
`key`, `value`; delete returns `key`, `deleted`. On Community n8n this group is license-gated.
Errors: `ERR_VARIABLE_LIST`, `ERR_VARIABLE_SET`, `ERR_VARIABLE_DELETE`, `ERR_VARIABLE_NOT_FOUND`.

`proj list`, `proj create <name>`, `proj update <id> --name <name>`, and `proj delete <id>
[--transfer-to <projectId>]` manage projects. Project writes return `id`, `name`, or `deleted`.
This group is license-gated on Community n8n. Errors: `ERR_PROJECT_LIST`, `ERR_PROJECT_CREATE`,
`ERR_PROJECT_UPDATE`, `ERR_PROJECT_DELETE`.

`user list` returns users and `user get <id>` returns `id`, `email`, `firstName`, `lastName`, and
`role`. Errors: `ERR_USER_LIST`, `ERR_USER_GET`.
