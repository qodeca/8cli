// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { defineConfig } from 'vitest/config';

/**
 * macOS-only e2e: exercises the real `security` keychain for the `auth` command
 * group. No Docker (GitHub macOS runners have no Docker daemon) — `auth verify`
 * runs against a local node:http mock instead of a live n8n.
 */
export default defineConfig({
  test: {
    include: ['test/e2e-macos/**/*.e2e.ts'],
    setupFiles: ['test/e2e/setup/matchers.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    reporters: process.env.CI ? ['github-actions', 'default'] : ['default'],
  },
});
