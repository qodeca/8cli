// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import type { OutputOptions, ColumnDef } from '../types.js';
import { outputJson } from './json.js';
import { outputTable } from './table.js';

/**
 * Output data in the appropriate format (JSON or table).
 * JSON is the default – table mode is opt-in via --table flag.
 */
export function output(data: unknown, options: OutputOptions): void {
  if (options.table && Array.isArray(data)) {
    outputTable(data, options.columns);
  } else {
    outputJson(data);
  }
}

/**
 * Output a structured error to stderr and exit.
 */
export function outputError(message: string, code: string, exitCode = 1): never {
  process.stderr.write(JSON.stringify({ error: message, code }, null, 2) + '\n');
  process.exit(exitCode);
}

export { outputJson } from './json.js';
export { outputTable } from './table.js';
