# AI agents and jq

8cli is suited to agents because normal output is JSON and it never prompts. Give an agent a URL
through `N8N_URL`, an API key through its secret store as `N8N_API_KEY`, and a narrow command.
Do not put secrets in prompts, logs, checked-in files, or command arguments.

```bash
8cli wf list | jq -r '.[].name'
8cli exec list --status error --limit 10 | jq 'map({id, workflowId, status})'
```

Inspect the exit status and stderr before acting on stdout. Errors have `{ "error": "…", "code":
"ERR_…" }`; branch on the stable code, not a human-readable message.
