# `auth` – stored credentials

Stores, lists and removes n8n credentials in the macOS keychain, and checks that 8cli can reach
n8n with the key it resolved.

> **macOS only.** `login`, `logout`, `list`, `set-api-key` and `set-credentials` use the macOS
> keychain. On Linux and Windows they fail with their `ERR_AUTH_*` code and the message
> _"Secret storage via the keychain is not yet implemented on Linux. Set the N8N_API_KEY (and
> N8N_EMAIL / N8N_PASSWORD) environment variables instead."_ `auth verify` works everywhere.

Credentials are stored per URL, in the keychain service `8cli`, under the accounts
`<url>/api-key`, `<url>/email` and `<url>/password`. The URL comes from the global `--url` or
`N8N_URL` – not from `8cli.json`.

**Reading a secret from standard input.** `--value`, `--password` and the global `--api-key`
accept `-` in these commands: 8cli then reads the secret from standard input and strips one
trailing newline. Using stdin avoids putting the literal secret in the command you type. It works
only in the `auth` commands.

| Subcommand                                      | What it does                                        |
| ----------------------------------------------- | --------------------------------------------------- |
| [`auth login`](#auth-login)                     | Store an API key, and optionally email and password |
| [`auth logout`](#auth-logout)                   | Remove everything stored for a URL                  |
| [`auth list`](#auth-list)                       | List the URLs that have stored credentials          |
| [`auth verify`](#auth-verify)                   | Check that the resolved URL and key work            |
| [`auth set-api-key`](#auth-set-api-key)         | Store only an API key                               |
| [`auth set-credentials`](#auth-set-credentials) | Store only an email and password                    |

## auth login

Stores an API key for a URL, plus an email and password if you give them.

```text
8cli --url <url> --api-key <key|-> auth login [--email <email>] [--password <password|->]
```

| Option                  | Required | Meaning                                                |
| ----------------------- | -------- | ------------------------------------------------------ |
| `--email <email>`       | No       | Email of an n8n user, for folder commands              |
| `--password <password>` | No       | That user's password; `-` reads it from standard input |

The API key comes from the **global** `--api-key` option (`-` reads it from standard input).
`auth login` does not read `N8N_API_KEY`.

```bash
printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com --api-key - auth login --email ops@example.com
```

```json
{
  "message": "Credentials stored successfully",
  "url": "https://n8n.example.com",
  "hasApiKey": true,
  "hasEmail": true,
  "hasPassword": false
}
```

Only one of `--api-key` and `--password` can be `-` in one call, because there is only one
standard input. To store both from standard input, run `auth set-api-key` and
`auth set-credentials` separately.

**Output:** `{ message, url, hasApiKey, hasEmail, hasPassword }` – `has*` say what was stored in
this call.

**Errors:** `ERR_NO_URL` (no `--url` or `N8N_URL`), `ERR_NO_API_KEY` (no global `--api-key`),
`ERR_AUTH_LOGIN` (the keychain refused, or not macOS).

## auth logout

Removes the API key, email and password stored for a URL. Safe to run twice.

```text
8cli --url <url> auth logout
```

No options.

```bash
8cli --url https://n8n.example.com auth logout
```

```json
{
  "message": "Credentials removed",
  "url": "https://n8n.example.com",
  "deletedApiKey": true,
  "deletedEmail": true,
  "deletedPassword": true
}
```

Run again, nothing is left to remove and each `deleted*` field is `false`; the exit code is
still 0.

**Output:** `{ message, url, deletedApiKey, deletedEmail, deletedPassword }` – each `deleted*` is
`true` if that entry existed and was removed.

**Errors:** `ERR_NO_URL`, `ERR_AUTH_LOGOUT`.

## auth list

Lists every URL that has something stored in the keychain. It never prints a secret, only which
secrets exist.

```text
8cli auth list
```

No options, and no URL needed.

```bash
8cli auth list
```

```json
[
  {
    "url": "https://n8n.example.com",
    "hasApiKey": true,
    "hasEmail": true,
    "hasPassword": true
  }
]
```

(Filtered to one entry.) With nothing stored, it prints `[]`.

**Output:** an array of `{ url, hasApiKey, hasEmail, hasPassword }`. Works with `--table`.

**Errors:** `ERR_AUTH_LIST`.

## auth verify

Checks that the URL and API key 8cli resolved (from flags, environment, config file or
keychain) are accepted by n8n. It asks n8n for one workflow.

```text
8cli auth verify
```

No options.

```bash
8cli auth verify
```

```json
{
  "url": "http://localhost:5678",
  "authenticated": true
}
```

When n8n rejects the key, the result goes to **stdout** (not stderr) with exit code 1:

```bash
8cli --api-key not-a-real-key auth verify
```

```json
{
  "url": "http://localhost:5678",
  "authenticated": false,
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Output:** `{ url, authenticated: true }`, or `{ url, authenticated: false, error, statusCode }`
with exit code 1 when n8n answers with an error.

**Errors:** `ERR_NO_URL`, `ERR_NO_API_KEY`, `ERR_AUTH_VERIFY` (the request never got an answer,
for example `fetch failed`, or the URL is plain `http://`).

## auth set-api-key

Stores only an API key for a URL.

```text
8cli --url <url> auth set-api-key --value <key|->
```

| Option          | Required | Meaning                                       |
| --------------- | -------- | --------------------------------------------- |
| `--value <key>` | Yes      | The API key; `-` reads it from standard input |

```bash
printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com auth set-api-key --value -
```

```json
{
  "message": "API key stored",
  "url": "https://n8n.example.com"
}
```

**Output:** `{ message, url }`.

**Errors:** `ERR_NO_URL`, `ERR_AUTH_SET_API_KEY`. Without `--value` you get the usage error
`error: required option '--value <key>' not specified`.

## auth set-credentials

Stores an email and password for a URL, for the [folder commands](folder.md).

```text
8cli --url <url> auth set-credentials --email <email> --password <password|->
```

| Option                  | Required | Meaning                                        |
| ----------------------- | -------- | ---------------------------------------------- |
| `--email <email>`       | Yes      | Email of the n8n user                          |
| `--password <password>` | Yes      | The password; `-` reads it from standard input |

```bash
printf '%s' "$MY_PASSWORD" | 8cli --url https://n8n.example.com auth set-credentials --email ops@example.com --password -
```

```json
{
  "message": "Credentials stored",
  "url": "https://n8n.example.com",
  "email": "ops@example.com"
}
```

**Output:** `{ message, url, email }`. The password is never printed.

**Errors:** `ERR_NO_URL`, `ERR_AUTH_SET_CREDENTIALS`.
