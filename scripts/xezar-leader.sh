#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
#
# Start the project leader: a Claude Code session attached to this project's xezar engine.
#
# The flag below is `--dangerously-load-development-channels`. It lets the xezar MCP server push
# events straight into the leader session. Without it the leader falls back to polling. The vendor
# put the word "dangerously" in the name on purpose: only run this against a server you trust.
# The server here is the one registered in `.mcp.json`. The engine must already run in this folder
# (`xezar --single-project`).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

socket=".local/xezar/ipc/$(basename "$PWD").sock"
if [ ! -S "$socket" ]; then
  echo "xezar-leader: the engine socket $socket is missing. Start the engine first: xezar --single-project" >&2
  exit 1
fi

# The xez-* skills are installed per machine, not committed. Warn, never install.
if [ ! -e ".claude/skills/xez-add-rule" ] || [ ! -f "skills-lock.json" ]; then
  echo "xezar-leader: the xez-* skills are missing in this clone. Get them with:" >&2
  echo "  npx -y skills add qodeca/xezar-skills --skill '*' --agent claude-code --agent codex --yes" >&2
fi

# One leader per project, and the engine has no takeover. If the session reports that the project
# is occupied, close the other Claude session in this folder and start this script again.
exec claude --dangerously-load-development-channels server:xezar "$@"
