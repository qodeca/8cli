# jq recipes

8cli prints JSON, and [`jq`](https://jqlang.org) is the easiest way to pick it apart. Each recipe
below was run against a local n8n; the output is real.

## Workflows

**Names only:**

```bash
8cli wf list | jq -r '.[].name'
```

```text
Daily sales report
Sync CRM contacts
Invoice reminder
New lead to Slack
```

**ID and name as tab-separated text:**

```bash
8cli wf list | jq -r '.[] | [.id, .name] | @tsv'
```

```text
Jr53yjULv3JYJRgF	Daily sales report
h7WdtiYbnI8jPk1M	Sync CRM contacts
qGfEkzEK64bJll67	Invoice reminder
x7Mn2vO5DDjRZYfD	New lead to Slack
```

**Count active and inactive workflows:**

```bash
8cli wf list | jq -c 'group_by(.active) | map({active: .[0].active, count: length})'
```

```text
[{"active":false,"count":4}]
```

**Find a workflow's ID by name:**

```bash
8cli wf list | jq -r '.[] | select(.name == "Invoice reminder") | .id'
```

```text
qGfEkzEK64bJll67
```

**Workflows changed most recently first:**

```bash
8cli wf list | jq -r 'sort_by(.updatedAt) | reverse | .[] | "\(.updatedAt)  \(.name)"'
```

```text
2026-09-23T21:41:31.383Z  Invoice reminder
2026-09-23T21:41:31.366Z  Sync CRM contacts
2026-09-23T21:41:31.349Z  New lead to Slack
2026-09-23T21:41:31.336Z  Daily sales report
```

**Which node types does a workflow use?**

```bash
8cli wf get Jr53yjULv3JYJRgF | jq -r '.nodes[].type'
```

```text
n8n-nodes-base.scheduleTrigger
n8n-nodes-base.noOp
```

**CSV of every workflow:**

```bash
8cli wf list | jq -r '(["id","name","active"] | @csv), (.[] | [.id, .name, .active] | @csv)'
```

```text
"id","name","active"
"Jr53yjULv3JYJRgF","Daily sales report",false
"h7WdtiYbnI8jPk1M","Sync CRM contacts",false
"qGfEkzEK64bJll67","Invoice reminder",false
"x7Mn2vO5DDjRZYfD","New lead to Slack",false
```

## Users and tags

**Emails of all users:**

```bash
8cli user list | jq -r '.[].email'
```

```text
owner@example.com
```

**Does a tag exist?** (`jq -e` sets the exit code, handy in scripts):

```bash
8cli tag list | jq -e 'any(.[]; .name == "billing")' >/dev/null && echo yes || echo no
```

```text
no
```

## Errors

**Just the error code:**

```bash
8cli wf get doesNotExist0001 2>&1 >/dev/null | jq -r .code
```

```text
ERR_WORKFLOW_GET
```

`2>&1 >/dev/null` sends stderr into the pipe and throws stdout away.

## Tips

- Use `jq -r` for plain text, `jq -c` for one JSON object per line.
- Never parse `--table` output; parse the JSON.
- `wf diff` is JSON only when there is no difference. Check with
  `8cli wf diff <id> | head -c1` – `{` means no difference.
