// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, it, expect, vi, afterEach } from 'vitest';
import { output, outputJson } from '../src/formatters/index.js';

function captureStdout(fn: () => void): string {
  let captured = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    captured += String(chunk);
    return true;
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return captured;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('outputJson', () => {
  it('emits pretty-printed JSON to stdout', () => {
    const out = captureStdout(() => outputJson({ a: 1, b: 'two' }));
    expect(JSON.parse(out)).toEqual({ a: 1, b: 'two' });
    expect(out).toContain('\n'); // pretty-printed
  });
});

describe('output', () => {
  it('defaults to JSON when table mode is off', () => {
    const out = captureStdout(() => output([{ id: 1 }], { table: false }));
    expect(JSON.parse(out)).toEqual([{ id: 1 }]);
  });

  it('emits JSON for non-array data even when table is requested', () => {
    const out = captureStdout(() => output({ id: 1 }, { table: true }));
    expect(JSON.parse(out)).toEqual({ id: 1 });
  });
});
