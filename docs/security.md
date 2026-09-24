# Security notes

8cli holds the keys to your n8n: an API key that can read and change every workflow and
credential it can see, and, for folder commands, a user's password. This page says how 8cli
treats them and what you should do.

To report a vulnerability in 8cli, follow the [security policy](../SECURITY.md).

## Where secrets live

- **Never in `8cli.json`.** The config file only accepts `url` and `workflowDir`. 8cli does not
  read a key or password from it.
- **Environment variables** (`N8N_API_KEY`, `N8N_PASSWORD`) – the recommended way on Linux,
  Windows and in CI. Load them from your CI's secret store; do not commit them.
- **The macOS keychain** – service `8cli`, one entry per URL. See
  [configuration](configuration.md#the-macos-keychain).

## What 8cli prints

- `config show` masks the API key (first four and last four characters, for example
  `n8n_...7890`) and prints the password as `****`. It does print the **email** in full.
- `auth set-credentials` prints the email it stored, never the password.
- Error messages and `--verbose` logs never contain the API key or password. `--verbose` does
  show request URLs, and error messages can include your n8n URL.
- `cred list` shows credential names, types and owners – **never the secret values** inside
  them. The n8n public API does not return them.
- `wf get`, `wf save` and `exec get --data` return what n8n returns. Workflow JSON and
  execution data can contain sensitive business data (for example a webhook payload); treat
  saved workflow files and execution dumps like any other private data.

## Keeping the literal secret out of the command you type

Anything on a command line can be seen by other users of the same machine (with `ps`) and ends
up in your shell history.

- For the `auth` storage commands, pass `-` and pipe the secret in:

  ```bash
  printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com auth set-api-key --value -
  printf '%s' "$MY_PASSWORD" | 8cli --url https://n8n.example.com auth set-credentials --email ops@example.com --password -
  printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com --api-key - auth login
  ```

  The `-` form works **only** for `auth login` (`--api-key` and `--password`),
  `auth set-api-key --value` and `auth set-credentials --password`. Anywhere else, `-` is taken
  literally.

- For every other command, use `N8N_API_KEY` instead of `--api-key`.

## Plain HTTP URLs

8cli refuses to send your API key over plain `http://`, with one exception for your own
machine:

| URL                                      | Allowed?                            |
| ---------------------------------------- | ----------------------------------- |
| `https://…`                              | Yes                                 |
| `http://localhost…`, `http://127.0.0.1…` | Yes – traffic stays on your machine |
| `http://[::1]…`                          | No in 8cli 0.1.2 – use `127.0.0.1`  |
| Any other `http://…`                     | Only with `--insecure`              |

`--insecure` means anyone on the network path can read your API key. Use it only on a network
you control, and prefer putting n8n behind HTTPS.

## Folder commands use a password

Folder commands cannot use the API key, because n8n does not expose folders in its public API.
They log in to n8n's internal API with an email and password, like the browser does. That
password gives full user access, not a scoped API key. Use a dedicated n8n user for automation
where you can. See [folder commands and the internal API](guides/folders.md).

## API key scope

8cli works with whatever the API key allows; a command outside the key's scope fails with the
error n8n returns. If your n8n lets you limit an API key's scopes, give read-only jobs such as
backups a key that can only read.

## Checklist

- Use `https://` for anything that is not on your own machine.
- Keep keys in environment variables or the keychain, never in `8cli.json` or a script.
- Pipe secrets into the `auth` commands with `-` so the literal secret is not in the command
  you type.
- Keep saved workflow files and execution dumps out of public repositories unless you have
  checked them.
- Run [`audit run`](reference/audit.md) now and then to see n8n's own security findings.
