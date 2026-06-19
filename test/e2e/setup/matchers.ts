// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { expect } from 'vitest';
import type { CliResult } from './helpers.js';

/**
 * Custom matcher encapsulating the CLI error contract: exit 1, stderr is a
 * structured `{error,code}` JSON with the expected code and a non-empty message,
 * and no raw stack trace leaked. Registered as a setupFile in the e2e configs.
 */
expect.extend({
  toFailWithCode(received: CliResult, expectedCode: string) {
    const problems: string[] = [];

    if (received.exitCode !== 1) {
      problems.push(`exit code was ${received.exitCode}, expected 1`);
    }

    let parsed: { error?: unknown; code?: unknown } | undefined;
    try {
      parsed = JSON.parse(received.stderr) as { error?: unknown; code?: unknown };
    } catch {
      problems.push(`stderr was not JSON: ${received.stderr.slice(0, 160)}`);
    }

    if (parsed) {
      if (parsed.code !== expectedCode) {
        problems.push(`code was ${String(parsed.code)}, expected ${expectedCode}`);
      }
      if (typeof parsed.error !== 'string' || parsed.error.length === 0) {
        problems.push('error message was missing or empty');
      }
    }

    if (/\n\s+at\s/.test(received.stderr)) {
      problems.push('stderr contained a raw stack trace');
    }

    const pass = problems.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? `expected CLI not to fail with code ${expectedCode}`
          : `expected CLI to fail with code ${expectedCode}, but: ${problems.join('; ')}`,
    };
  },
});
