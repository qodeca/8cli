// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerFolderCommands } from '../src/commands/folder.js';

// Regression coverage for #67: `folder move` (and `folder create`/`folder delete`)
// ignored `--dry` and performed the real change. A dry run is a preview built from
// the command's arguments, so it must make no request at all: no login, no
// (license-gated) folder list, no write. The stub answers every route the pre-fix
// code would reach and records each call, so "no request" is asserted directly
// rather than inferred from the output.
//
// The `without --dry` case is a guard, not the regression: it passes against the
// unfixed code too, and exists so the fix cannot silence the real path.

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Stub `fetch` with every internal route a folder command can reach, so the
 * pre-fix code runs to completion and its calls are visible. Returns the list of
 * `<METHOD> <pathname>` it was asked for.
 */
function stubFetch(): string[] {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
      if (url.pathname === '/rest/login') return jsonResponse({});
      if (url.pathname === '/rest/projects') {
        return jsonResponse([{ id: 'p1', name: 'Personal', type: 'personal' }]);
      }
      if (url.pathname === '/rest/projects/p1/folders') {
        return init?.method === 'POST'
          ? jsonResponse({ id: 'f2', name: 'Invoices', parentFolderId: 'f1' })
          : jsonResponse([{ id: 'f1', name: 'Finance', parentFolderId: null }]);
      }
      if (url.pathname === '/rest/workflows') {
        return jsonResponse([
          { id: 'wf1', name: 'Target', active: false, createdAt: '', updatedAt: '' },
        ]);
      }
      if (url.pathname.startsWith('/rest/workflows/')) return jsonResponse({ id: 'wf1' });
      return jsonResponse({});
    }),
  );
  return calls;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  calls: string[];
}

/** Run `8cli [--dry] folder …` in-process with output, exit and requests captured. */
async function runFolder(args: string[]): Promise<RunResult> {
  const calls = stubFetch();
  const out: string[] = [];
  const err: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    out.push(String(chunk));
    return true;
  });
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    err.push(String(chunk));
    return true;
  });
  let exitCode = 0;
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCode = code ?? 0;
    throw new ExitSignal(exitCode);
  }) as never);

  // The pre-fix code logs in before it can be caught ignoring `--dry`; supply the
  // credentials a folder command needs so it reaches the request, not the guard.
  vi.stubEnv('N8N_EMAIL', 'e2e@example.com');
  vi.stubEnv('N8N_PASSWORD', 'InsecureE2eOnly1');

  try {
    const program = new Command();
    program
      .option('--url <url>')
      .option('--api-key <key>')
      .option('--config <path>')
      .option('--table', '', false)
      .option('--dry', '', false)
      .option('--verbose', '', false)
      .option('--insecure', '', false);
    registerFolderCommands(program);
    await program.parseAsync(['--url', 'http://127.0.0.1:5678', ...args], { from: 'user' });
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout: out.join(''), stderr: err.join(''), exitCode, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('folder --dry is a request-free preview (#67)', () => {
  it('move --dry to (root) sends no request and previews the move', async () => {
    const r = await runFolder(['--dry', 'folder', 'move', 'Target', '--to', '(root)']);

    expect(r.calls).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      dryRun: true,
      moved: { workflowId: null, workflowName: 'Target', toFolder: '(root)' },
    });
  });

  it('move --dry to a named folder sends no request either', async () => {
    const r = await runFolder(['--dry', 'folder', 'move', 'Target', '--to', 'Finance']);

    expect(r.calls).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      dryRun: true,
      moved: { workflowId: null, workflowName: 'Target', toFolder: 'Finance' },
    });
  });

  it('create --dry sends no request and previews the folder', async () => {
    const r = await runFolder(['--dry', 'folder', 'create', 'Invoices', '--parent', 'Finance']);

    expect(r.calls).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      dryRun: true,
      id: null,
      name: 'Invoices',
      parentFolder: 'Finance',
    });
  });

  it('delete --dry sends no request and previews the deletion', async () => {
    const r = await runFolder(['--dry', 'folder', 'delete', 'Finance']);

    expect(r.calls).toEqual([]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({
      dryRun: true,
      deleted: { id: null, name: 'Finance' },
    });
  });
});

describe('folder without --dry still performs the change (guard)', () => {
  it('move performs the PATCH and reports the resolved workflow', async () => {
    const r = await runFolder(['folder', 'move', 'Target', '--to', '(root)']);

    expect(r.exitCode).toBe(0);
    expect(r.calls).toContain('PATCH /rest/workflows/wf1');
    expect(JSON.parse(r.stdout)).toEqual({
      moved: { workflowId: 'wf1', workflowName: 'Target', toFolder: '(root)' },
    });
  });

  it('create performs the POST and reports the created folder', async () => {
    const r = await runFolder(['folder', 'create', 'Invoices']);

    expect(r.exitCode).toBe(0);
    expect(r.calls).toContain('POST /rest/projects/p1/folders');
    expect(JSON.parse(r.stdout)).toEqual({ id: 'f2', name: 'Invoices', parentFolderId: 'f1' });
  });
});
