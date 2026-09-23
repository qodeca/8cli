# Workflow backup, diff and publish

Save workflow JSON, review changes, then publish selected or all files. n8n assigns a new ID when
publishing a file that does not match an existing workflow.

```bash
8cli wf save --dir workflows
8cli wf diff 123 --dir workflows
8cli --dry wf publish --id 123
8cli wf publish --id 123
```

Publish retains only the fields n8n accepts on update: name, nodes, connections, static data, and
the `executionOrder` setting. `active` is not included in that update payload; use `wf activate`
or `wf deactivate` deliberately.
