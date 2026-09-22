# .xezar – the agent pipeline's files

Everything here is maintained and versioned, except what `.xezar/.gitignore` lists.

- `workflows/` – the task workflows. `checks/` – the gate and preflight scripts. `skills/` – role skills.
- `docs/` – start at `docs/README.md`. The leader's guide is `docs/leader-guide.md`; routing is `docs/model-routing.md`.
- `pipeline/` – `config.json`, `labels.json`, the tracker, toolchain and security descriptors.
- `campaigns/` – the leader's record. `onboarding.json` – what the onboarding installed, with digests.

Rules: never edit `workspace.json`, `workspace-ui.json` or `agent-accounts.json` by hand – they are
machine state. The gate list lives in `checks/repo-gates.sh`, `pipeline/config.json`, `AGENTS.md`
and `SDLC.md`; change all four together. A diff to `checks/leader-context.sh` is security-sensitive
(`CODE_REVIEW.md` § Security).
