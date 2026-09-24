# Folder commands and the internal API

The `folder` commands work differently from the rest of 8cli. This guide explains how, why, and
what that means for you.

## Two APIs

n8n has two APIs:

| API              | Paths         | Signs in with                         | Promised to stay stable?        | 8cli uses it for       |
| ---------------- | ------------- | ------------------------------------- | ------------------------------- | ---------------------- |
| **Public API**   | `/api/v1/...` | An API key (`X-N8N-API-KEY`)          | Yes, it is documented           | Everything but folders |
| **Internal API** | `/rest/...`   | Email and password → a session cookie | No, it serves n8n's own web app | `folder` commands only |

n8n's public API has no folders at all. The only way to read or change them is the internal API
that n8n's own web app uses. So the `folder` commands log in exactly like a browser does: they
send your email and password to `/rest/login`, keep the session cookie, and use it for the
folder requests.

## What that means for you

- **You need an email and password, not an API key.** Set `N8N_EMAIL` and `N8N_PASSWORD`, or on
  macOS store them with [`auth set-credentials`](../reference/auth.md#auth-set-credentials). The
  API key is not used.
- **A password is more powerful than an API key.** It can do anything that user can do in the
  web app, and it cannot be limited to certain scopes. Use a dedicated n8n user for automation
  where you can.
- **It can break with an n8n upgrade.** n8n can change its internal API in any release. If a
  folder command starts failing after an upgrade while the other commands still work, this is
  the likely cause.
- **It logs in on every command.** Each `folder` command signs in again; nothing is cached
  between runs.
- **It needs a licensed n8n.** On the Community edition the login succeeds and n8n then refuses
  the folder request (`Plan lacks license for this feature`). See
  [Community and Enterprise n8n](../community-vs-enterprise.md).
- **It works in your personal project.** The commands look up your personal project and work on
  the folders there.

## Setting it up

```bash
export N8N_URL=https://n8n.example.com
export N8N_EMAIL=ops@example.com
```

```bash
read -rs N8N_PASSWORD && export N8N_PASSWORD
```

```bash
8cli folder tree
```

The silent `read` keeps the password out of terminal output and shell history.

Without an email or password:

```json
{
  "error": "Email and password required for folder operations. Use `auth set-credentials` or N8N_EMAIL/N8N_PASSWORD env vars.",
  "code": "ERR_NO_CREDENTIALS"
}
```

With a wrong password, the error carries the folder command's own code:

```json
{
  "error": "Wrong username or password. Do you have caps lock on?",
  "code": "ERR_FOLDER_TREE"
}
```

## Everyday use

With a licensed n8n (on Community each of these stops at the license error, so their success
output is not shown here; the shapes are on the [`folder` reference](../reference/folder.md)):

```bash
8cli folder create Finance
8cli folder create Invoices --parent Finance
8cli folder move 'Invoice reminder' --to Invoices
8cli folder tree
```

Folders and workflows are found by **name**, ignoring upper and lower case. Quote names that
contain spaces. `--to '(root)'` moves a workflow out of every folder (on n8n 2.40.5 Community it
fails with `Expected string, received null`).

## Mirroring folders on disk

[`folder sync`](../reference/folder.md#folder-sync) arranges the files that `wf save` wrote into
subfolders that match n8n's folders. It moves local files only and never changes n8n. Preview
with `--dry`:

```bash
8cli wf save
8cli --dry folder sync
8cli folder sync
```

After a sync, the files sit in subfolders, and `wf publish` and `wf diff` only look at the top
level of the folder. Point them at a file with `wf publish --file` or `wf diff --dir`.

## Command reference

Every option and output shape is on the [`folder` reference](../reference/folder.md).
