# Authentication and configuration

`auth login [--email <email>] [--password <password>]` stores the global `--api-key`; `--password -`
reads stdin. `auth logout`, `auth list`, and `auth verify` respectively remove, list and test stored
credentials. `auth set-api-key --value <key>` and `auth set-credentials --email <email> --password <password>`
store individual values. Their success objects include `message`, `url`, and where relevant
`hasApiKey`, `hasEmail`, `hasPassword`, or `email`.

`config show` returns `url`, masked `apiKey`, `workflowDir`, `table`, `dry`, `verbose` and
`insecure`. Authentication errors include `ERR_NO_URL`, `ERR_NO_API_KEY`, `ERR_AUTH_LOGIN`,
`ERR_AUTH_LOGOUT`, `ERR_AUTH_LIST`, `ERR_AUTH_VERIFY`, `ERR_AUTH_SET_API_KEY`,
`ERR_AUTH_SET_CREDENTIALS` and `ERR_CONFIG`.
