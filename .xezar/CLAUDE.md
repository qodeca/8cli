# .xezar – the agent pipeline's files

Everything here is committed, except what `.xezar/.gitignore` lists.

- `workflows/` – task workflows. `checks/` – gate and preflight scripts. `skills/` – role skills.
- `docs/` – start at `docs/README.md`. The leader guide is `docs/leader-guide.md`.
- `routing.json` – which lane runs which work, read only through `checks/route.mjs`.
- `pipeline/` – `config.json`, `labels.json`, and the tracker, toolchain and security descriptors.
- `campaigns/` – the leader's record. `onboarding.json` – what onboarding installed, with digests.

Rules:

- Never edit `workspace.json`, `workspace-ui.json` or `agent-accounts.json` by hand – they are
  machine state and are not committed.
- The committed config carries no machine-sized resource limits (`maxParallel`,
  `memoryLimitMb`): a ceiling is a property of a machine, not of the project.
- Never stop a process by command-line pattern (`pkill -f`): it matches every peer agent on this
  machine. Stop only a PID you started.
- The gate list lives in `checks/repo-gates.sh`, `pipeline/config.json`, `AGENTS.md` and
  `SDLC.md`; change all four together.
- A diff to `checks/leader-context.sh` or to the `SessionStart` hook is security-sensitive
  (`CODE_REVIEW.md` § Security).
