// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { defineConfig } from 'vitest/config';

/**
 * E2E configuration: black-box tests that spawn the built `dist/bin/8cli.js`
 * against a real n8n started by Testcontainers (see test/e2e/setup/global.ts).
 *
 * The suite shares ONE mutable n8n container, so `fileParallelism: false` is
 * LOAD-BEARING: specs (and their list/audit assertions) assume no other file is
 * mutating the instance concurrently. Do not enable parallelism without giving
 * each file its own container or a per-file resource namespace.
 *
 * No `retry`: this suite must surface real eventual-consistency / state races
 * rather than mask them. Container/startup resilience lives in global.ts.
 * Unit tests keep their own vitest.config.ts.
 */
export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.ts'],
    globalSetup: ['test/e2e/setup/global.ts'],
    setupFiles: ['test/e2e/setup/matchers.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
    reporters: process.env.CI ? ['github-actions', 'default'] : ['default'],
  },
});
