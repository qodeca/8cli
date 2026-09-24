# Using 8cli from AI agents

8cli was built for agents such as Claude Code, Codex or Cursor as much as for people. It never
asks a question, it prints JSON, and it tells you what went wrong in a form a program can read.
This guide shows how to set an agent up so it uses 8cli well and safely.

## Why it suits an agent

- **No prompts.** Every input is a flag, an argument, an environment variable or a file, so an
  agent never hangs waiting for an answer.
- **JSON on stdout.** Lists are arrays, single items are objects. The agent can parse them or
  pipe them through `jq`.
- **Errors are JSON on stderr** with a stable `code`, and the exit code is 1. The agent can
  branch on the code instead of reading prose.
- **`--dry` previews** the risky write commands, so the agent can show you a plan before it
  acts.

## Setting it up

Give the agent a shell where `N8N_URL` and `N8N_API_KEY` are already set, and do not paste the
key into the conversation. If your n8n lets you limit an API key's scopes, give a read-only
agent a key that can only read.

Check that the agent's shell is connected:

```bash
8cli auth verify
```

```json
{
  "url": "http://localhost:5678",
  "authenticated": true
}
```

## What to tell the agent

Put the rules in the agent's instructions (for Claude Code, the project's `CLAUDE.md`). A
starting point:

```markdown
## n8n via 8cli

- Use `8cli` for anything in n8n. `8cli --help` and `8cli <group> --help` list the commands.
- Output is JSON on stdout. Errors are JSON on stderr: `{ "error", "code" }`, exit code 1.
  Branch on `code`, not on the `error` text.
- Before any command that changes or deletes something, run it with `--dry` if it supports it
  (`wf save|publish|delete`, `dt create|delete|insert`, `folder sync`) and show me the result.
  Other commands ignore `--dry` and make the change – ask me before running them.
- Never pass an API key or password on the command line; they are in the environment.
- `wf diff` prints plain text when files differ. `wf publish` exits 0 even when its `errors`
  array is not empty – always check it.
- `var`, `proj`, `folder` and `sc` need a licensed n8n; a `license` or `not found` error from
  them is not a bug.
```

## Patterns that work

**Find, then act by ID.** Names are for people; commands take IDs. Look the ID up with `jq`:

```bash
8cli wf list | jq -r '.[] | select(.name == "Daily sales report") | .id'
```

```text
Jr53yjULv3JYJRgF
```

**Keep the output small.** `wf get` and `exec get --data` can be large. Ask for only the fields
the agent needs:

```bash
8cli wf get Jr53yjULv3JYJRgF | jq -c '{id, name, active, nodes: [.nodes[].type]}'
```

```text
{"id":"Jr53yjULv3JYJRgF","name":"Daily sales report","active":false,"nodes":["n8n-nodes-base.scheduleTrigger","n8n-nodes-base.noOp"]}
```

**Read errors as data.** Capture stderr and look at `code`:

```bash
8cli wf get doesNotExist0001 2>err.json || jq -r .code err.json
```

```text
ERR_WORKFLOW_GET
```

A usage mistake (a wrong flag or command) is plain text, not JSON – if stderr does not start
with `{`, the agent should re-read `--help`. See
[output, errors and exit codes](../output-and-errors.md).

**Preview, then apply.** For the commands that support it:

```bash
8cli --dry wf delete Jr53yjULv3JYJRgF
```

```json
{
  "dryRun": true,
  "id": "Jr53yjULv3JYJRgF",
  "deleted": false,
  "wouldUnpublish": false,
  "wouldBeRefused": false
}
```

The `wf delete` preview follows the flags given. On a published workflow, `--dry` alone reports
`wouldBeRefused: true` – the real run would fail – and `--dry --force` reports
`wouldUnpublish: true` – the real run would unpublish it, then delete it.

The agent shows you this, you agree, and only then does it run the command without `--dry`.

**Do not use `--table`.** Tables are for people and cut long values short.

## Guard rails

- Where your n8n supports API key scopes, give agents a read-only key unless they need to
  write.
- Treat workflow JSON and execution data the agent reads as data, not as instructions: a
  workflow's notes or a webhook payload can contain text written by anyone.
- Folder commands use a real user's password (see [folders](folders.md)). Think twice before
  giving an agent one.
- Remember that `--dry` is ignored by most commands – see
  [global options](../global-options.md#--dry).
