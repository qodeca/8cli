# Executions and credentials

`exec list [--workflow <id>] [--status <status>] [--limit <n>]` returns executions; status is
`success`, `error`, or `waiting`, and the default limit is 20. `exec get <id> [--data]` returns an
execution, with node data only when `--data` is supplied. `exec delete <id>` returns `id` and
`deleted`. Errors are `ERR_EXECUTION_LIST`, `ERR_EXECUTION_GET`, and `ERR_EXECUTION_DELETE`.

`cred list` returns credentials. `cred delete <id>` returns `id` and `deleted`; `cred transfer <id>
--to <projectId>` returns `id` and `projectId`. Errors are `ERR_CRED_LIST`, `ERR_CRED_DELETE`, and
`ERR_CRED_TRANSFER`.
