# .xezar

The agent pipeline's own folder. Treat everything here as configuration, not as product code.

| Path | What it is |
|---|---|
| `config.json` | the engine's project settings: base branch and system prompt |
| `pipeline/config.json` | the pipeline contract: base branch, tracker, validation commands, labels, QA gate, paths |
| `pipeline/labels.json` | the label taxonomy, with a colour per group and a description per label |
| `pipeline/trackers/github.md` | how to perform each tracker operation on GitHub |
| `pipeline/toolchains/npm.md` | how this stack builds and tests |
| `workflows/*.yaml` | one workflow per kind of task; `model-routing.md` says which row runs which |
| `checks/` | the gate and its helpers. `repo-gates.sh` is the one entry point |
| `skills/xezar-*.md` | the role instructions a dispatched agent follows |
| `docs/` | how the pieces work; `leader-guide.md` and `model-routing.md` are the leader's own |
| `campaigns/` | the committed record of what happened and what the owner decided |
| `onboarding.json` | what this setup installed, its digests, and the shape of the answers |

`agent-accounts.json`, `workspace.json` and `workspace-ui.json` are machine-level state and are
gitignored by `.xezar/.gitignore`. They are never committed.

Changing anything under `checks/` is a security-sensitive review – see `CODE_REVIEW.md`.
