# Troubleshooting

**`ERR_NO_URL` or `ERR_NO_API_KEY`.** Supply `--url` and `--api-key`, set `N8N_URL` and
`N8N_API_KEY`, or configure the keychain. Check the resolved non-secret values with `config show`.

**An HTTP URL is rejected.** Use HTTPS. For a trusted local n8n only, add `--insecure` before the
command group.

**Folder commands fail.** They require email and password credentials for the internal API, unlike
the public API commands. Community n8n also license-gates folder operations.

**Variable, project, folder, or source-control commands fail on Community n8n.** These are
license-gated n8n features. The CLI returns the n8n failure; use a licensed instance for them.

**`ERR_NOT_SUPPORTED` from `sc push`.** Push is not exposed by n8n's public API.
