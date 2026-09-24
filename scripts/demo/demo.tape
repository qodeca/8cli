# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
#
# Terminal demo for the README, recorded with charmbracelet vhs. Do not run this file on its
# own: `npm run demo:record` (scripts/demo/record.sh) starts the local n8n, seeds the demo
# workflows, builds the CLI and passes DEMO_ENV_FILE and DEMO_CLI in the environment.
#
# vhs writes raw frames only; record.sh encodes the GIF with ffmpeg, because the GIF encoder of
# vhs 0.12 silently writes nothing with ffmpeg 9. Keep Framerate in step with FPS in record.sh.
#
# Nothing secret reaches the screen: the credentials are loaded from the env file inside the
# hidden block, the prompt is a bare "$ " and no command prints a key, an email or a path.

Output .local/xezar/demo/frames/

Require node
Require jq

Set Shell bash
Set FontSize 18
Set Width 1200
Set Height 700
Set Padding 0
Set Framerate 12
Set Theme "Catppuccin Frappe"
Set TypingSpeed 45ms

Hide
Type `unset HISTFILE; set -a; . "$DEMO_ENV_FILE"; set +a; unset N8N_EMAIL N8N_PASSWORD`
Enter
Type `8cli() { node "$DEMO_CLI" "$@"; }; PS1='$ '; clear`
Enter
Sleep 500ms
Show

Type "# Check the API key works"
Enter
Type "8cli auth verify"
Enter
Sleep 2.5s

Hide
Type "clear"
Enter
Sleep 300ms
Show

Type "# Every command prints JSON"
Enter
Type "8cli wf list"
Enter
Sleep 3.5s

Hide
Type "clear"
Enter
Sleep 300ms
Show

Type "# Humans can ask for a table"
Enter
Type "8cli wf list --table"
Enter
Sleep 3.5s

Type "# Scripts and agents pipe to jq"
Enter
Type "8cli wf list | jq -r '.[].name'"
Enter
Sleep 3s

Hide
Type "clear"
Enter
Sleep 300ms
Show

Type "# Preview a change with --dry – nothing is deleted"
Enter
Type `id=$(8cli wf list | jq -r '.[] | select(.name == "Invoice reminder") | .id')`
Enter
Sleep 1s
Type `8cli wf delete "$id" --dry`
Enter
Sleep 4s
