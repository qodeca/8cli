# `audit` – security audit

Runs n8n's built-in security audit and prints its report. The audit looks for risky settings,
unprotected webhooks, unused credentials and similar problems. Works on the Community edition.

| Subcommand                | What it does                       |
| ------------------------- | ---------------------------------- |
| [`audit run`](#audit-run) | Run the audit and print the report |

## audit run

```text
8cli audit run
```

No options. 8cli asks n8n for its default audit, all categories.

The report can be long. Here it is summarised with `jq`:

```bash
8cli audit run | jq -c '[.[] | {risk, sections: [.sections[].title]}]'
```

```text
[{"risk":"instance","sections":["Unprotected webhooks in instance","Security settings"]}]
```

One finding in full:

```bash
8cli audit run | jq '."Instance Risk Report".sections[0]'
```

```json
{
  "title": "Unprotected webhooks in instance",
  "description": "This webhook node has the \"Authentication\" field set to \"None\" and is not directly connected to a node to validate the payload. Every unprotected webhook allows your workflow to be called by any third party who knows the webhook URL.",
  "recommendation": "Consider setting the \"Authentication\" field to an option other than \"None\", or validating the payload with one of the following nodes: n8n-nodes-base.if,n8n-nodes-base.switch,n8n-nodes-base.code,n8n-nodes-base.function,n8n-nodes-base.functionItem.",
  "location": [
    {
      "kind": "node",
      "workflowId": "BQLsNfoyvbhwTPTP",
      "workflowName": "New order webhook",
      "nodeId": "de1e35d1-c82d-4a74-87a3-f07df0f7f608",
      "nodeName": "Webhook",
      "nodeType": "n8n-nodes-base.webhook"
    }
  ]
}
```

**Output:** n8n's audit report, passed through. It is an object with one key per report that
found something, for example `"Instance Risk Report"`. Each report has `risk` (the category)
and `sections`; each section has `title`, `description`, `recommendation` and `location` (the
workflows, nodes or credentials concerned). The "Security settings" section has `settings`
instead of findings. A report with nothing to say is left out, so the set of keys changes from
instance to instance.

**Errors:** `ERR_AUDIT`.

A weekly audit in CI is on [using 8cli in CI](../guides/ci.md#weekly-security-audit).
