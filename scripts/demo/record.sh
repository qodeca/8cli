#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
#
# Re-record the README demo GIF end to end: `npm run demo:record`.
#
# Starts (and seeds) the local n8n 2.40.5, adds the demo workflows, builds the CLI, then plays
# scripts/demo/demo.tape with vhs and encodes the frames into assets/demo/8cli-demo.gif with
# ffmpeg. Needs Docker, vhs and ffmpeg (`brew install vhs` brings both) and jq. Progress goes to stderr; stdout is one JSON object. Errors go to
# stderr as { "error", "code" } with exit code 1.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAPE="scripts/demo/demo.tape"
GIF="assets/demo/8cli-demo.gif"
FRAMES=".local/xezar/demo/frames"
FPS=12                # Keep in step with Set Framerate in the tape.
BACKGROUND="0x303446" # Catppuccin Frappe background, the tape's theme.
MAX_BYTES=$((2 * 1024 * 1024))

fail() {
  printf '{"error":"%s","code":"%s"}\n' "$1" "$2" >&2
  exit 1
}

cd "$ROOT"

for tool in vhs ffmpeg jq docker; do
  command -v "$tool" >/dev/null 2>&1 || fail "$tool is not installed" "ERR_NO_$(echo "$tool" | tr '[:lower:]' '[:upper:]')"
done

# The credentials live in the git common dir (the one n8n instance is shared by every
# worktree); the script reports the path it wrote, so there is one source of truth for it.
ENV_FILE="$(npm run -s n8n:local -- start | jq -r '.credentials.envFile // empty')"

[ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ] && [ ! -L "$ENV_FILE" ] || fail "local n8n env file missing" "ERR_NO_ENV_FILE"

(
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  npx tsx scripts/demo/seed-demo.ts >&2
)

npm run -s build >&2

# vhs moves its frame folder into place: the parent must exist and the folder must not.
rm -rf "$FRAMES" && mkdir -p "$(dirname "$FRAMES")"
DEMO_ENV_FILE="$ENV_FILE" DEMO_CLI="$ROOT/dist/bin/8cli.js" vhs --quiet "$TAPE" >&2
[ -f "$FRAMES/frame-text-00001.png" ] || fail "vhs wrote no frames" "ERR_NO_FRAMES"

# Cursor layer over text layer, a theme-coloured margin, then one shared palette for a small GIF.
mkdir -p "$(dirname "$GIF")"
ffmpeg -y -loglevel error \
  -framerate "$FPS" -i "$FRAMES/frame-text-%05d.png" \
  -framerate "$FPS" -i "$FRAMES/frame-cursor-%05d.png" \
  -filter_complex "[0][1]overlay,pad=iw+48:ih+48:24:24:color=$BACKGROUND,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
  "$GIF"

bytes=$(wc -c <"$GIF" | tr -d ' ')
[ "$bytes" -le "$MAX_BYTES" ] || fail "GIF is $bytes bytes, over the 2 MB budget" "ERR_GIF_TOO_LARGE"

printf '{"files":["%s"],"bytes":%s}\n' "$GIF" "$bytes"
