// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Issue #45: commander's own usage errors printed a plain-text `error: ...` line
// to stderr instead of the `{ "error", "code" }` JSON that every other 8cli error
// uses. These cases fail during parsing, before any action handler runs, so they
// never touch a network or the keychain.
const cli = resolve(import.meta.dirname, '../bin/8cli.ts');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(args: string[]): CliResult {
  const result = spawnSync(process.execPath, ['--import', 'tsx', cli, ...args], {
    encoding: 'utf-8',
    input: '',
    // Blank out ambient n8n credentials so a parse error can never be confused
    // with a configuration error from a developer's shell.
    env: { ...process.env, N8N_URL: '', N8N_API_KEY: '', N8N_EMAIL: '', N8N_PASSWORD: '' },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('usage errors are structured JSON', () => {
  it.each<[string, string[], string]>([
    [
      'a missing required option',
      ['folder', 'move', 'some-workflow'],
      "required option '--to <folder>' not specified",
    ],
    ['a missing required argument', ['wf', 'get'], "missing required argument 'id'"],
    ['an unknown option', ['wf', 'list', '--nope'], "unknown option '--nope'"],
    ['an unknown command', ['nope'], "unknown command 'nope'"],
  ])('reports %s as ERR_USAGE on stderr and exits 1', (_label, args, message) => {
    const r = run(args);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(JSON.parse(r.stderr)).toEqual({ error: message, code: 'ERR_USAGE' });
  });
});

describe('help and version are unchanged', () => {
  it('--help prints usage to stdout and exits 0', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Usage: 8cli');
    expect(r.stderr).toBe('');
  });

  it('--version prints the version to stdout and exits 0', () => {
    const r = run(['--version']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(r.stderr).toBe('');
  });

  it('a subcommand --help prints its usage to stdout and exits 0', () => {
    const r = run(['folder', 'move', '--help']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--to');
    expect(r.stderr).toBe('');
  });
});

// Guard, passes before and after the fix: these are commander help displays, not
// the usage errors routed to JSON. They lock the stderr text against a regression
// where the JSON error is appended after the help text (stderr would stop being
// parseable as either one thing or the other).
describe('bare invocation and `help <unknown>` keep their help output', () => {
  it('prints help to stderr and exits 1 when no command is given', () => {
    const r = run([]);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('Usage: 8cli');
    expect(r.stderr).not.toContain('ERR_USAGE');
  });

  it('prints help to stderr and exits 1 for `help <unknown>`', () => {
    const r = run(['help', 'nope']);
    expect(r.status).toBe(1);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('Usage: 8cli');
    expect(r.stderr).not.toContain('ERR_USAGE');
  });
});
