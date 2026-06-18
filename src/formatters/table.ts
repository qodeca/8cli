// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import Table from 'cli-table3';
import type { ColumnDef } from '../types.js';

/**
 * Output data as a formatted table to stdout.
 */
export function outputTable(data: unknown[], columns?: ColumnDef[]): void {
  if (!Array.isArray(data) || data.length === 0) {
    process.stdout.write('(no data)\n');
    return;
  }

  // Auto-detect columns from first item if not provided
  const cols: ColumnDef[] =
    columns ||
    Object.keys(data[0] as Record<string, unknown>).map((key) => ({
      key,
      header: key,
    }));

  // Only set colWidths when at least one column defines a width; passing
  // `colWidths: undefined` makes cli-table3 throw in mergeTableOptions.
  const hasWidths = cols.some((c) => c.width != null);
  const table = new Table({
    head: cols.map((c) => c.header),
    ...(hasWidths ? { colWidths: cols.map((c) => c.width ?? null) } : {}),
    style: {
      head: ['cyan'],
    },
  });

  for (const item of data) {
    const row = cols.map((col) => {
      const value = (item as Record<string, unknown>)[col.key];
      if (col.formatter) return col.formatter(value);
      if (value === null || value === undefined) return '';
      return String(value);
    });
    table.push(row);
  }

  process.stdout.write(table.toString() + '\n');
}
