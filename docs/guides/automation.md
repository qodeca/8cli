# CI and workflow files

Set `N8N_URL` and `N8N_API_KEY` from your CI secret manager, then use JSON output in scripts. A
write operation can be previewed with `--dry` when that command supports it.

```bash
8cli wf save --dir workflows
git diff --exit-code workflows
8cli --dry wf publish --id 123
```

`wf publish` reads its directory from configuration and accepts `--id` or `--file`. Use `8cli
--help` and the [workflow reference](../reference/workflows.md) in automation.
