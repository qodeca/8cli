# Plan – 20260923-n8n-2-40

Owner-approved 2026-09-23 22:47. Copied in once; never edited. Changes go to `decisions.md`.

Target: n8n 2.40.5 (latest release, published 2026-09-21). Tests pin 2.25.7 today (`test/e2e/setup/global.ts`).

1. Local environment – long-running Docker Compose n8n 2.40.5 with one script to start, seed and reset it; e2e image pin moves to 2.40.5.
2. Validation – every 8cli command and branch run against 2.40.5 (use `test/e2e/COVERAGE.md` as the map); defects filed as issues; report of what works, what broke, what changed in the API. Starts only after 1 is merged.
