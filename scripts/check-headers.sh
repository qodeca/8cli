#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# SPDX-FileCopyrightText: 2026 Qodeca
#
# Fail if any TypeScript source file under bin/ or src/ is missing the
# required SPDX license header. Run in CI and locally via `npm run check:headers`.

set -euo pipefail

missing=0
while IFS= read -r -d '' file; do
  if ! grep -q 'SPDX-License-Identifier: GPL-3.0-only' "$file"; then
    echo "Missing SPDX header: $file"
    missing=1
  fi
done < <(find bin src -name '*.ts' -print0)

if [ "$missing" -ne 0 ]; then
  echo "error: one or more source files are missing the SPDX license header." >&2
  exit 1
fi

echo "All source files carry the SPDX license header."
