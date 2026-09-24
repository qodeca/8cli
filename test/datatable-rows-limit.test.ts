// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { registerDataTableCommands } from '../src/commands/datatable.js';

// Regression coverage for #41: `dt rows --limit N` sent N straight to n8n as the
// page size, and n8n caps that query param at 250, so any --limit above 250 failed
// with `400 request/query/limit must be <= 250`. The stub below reproduces that
// server: it answers a `limit` above 250 with n8n's own 400, and serves a cursor
// chain otherwise. So the --limit 500 case is red against the unfixed code (exit 1,
// ERR_HTTP_400) and green once the client pages at min(limit, 250).
//
// The --limit 10 case is the other half of the contract: a request at or below the
// cap still goes out as one page of that size and stops there, instead of walking
// every cursor and slicing the merge.

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
 * Stub `fetch` with n8n's data-table rows route. It rejects `limit > 250` exactly
 * as n8n does, and otherwise returns pages of `min(limit, 250)` rows with up to
 * three cursors on offer. Returns the URLs it was asked for, in order.
 */
function stubRowsFetch(): string[] {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      urls.push(url.toString());
      if (url.pathname !== '/api/v1/data-tables/dt1/rows') {
        return jsonResponse({ message: 'not found' }, 404);
      }
      const limit = Number(url.searchParams.get('limit'));
      if (limit > 250) {
        return jsonResponse({ message: 'request/query/limit must be <= 250' }, 400);
      }
      const cursor = url.searchParams.get('cursor');
      const page = cursor ? Number(cursor.slice(1)) : 1;
      const data = Array.from({ length: Math.min(limit, 250) }, (_, i) => ({
        id: `r${page}-${i + 1}`,
      }));
      // Three pages are always on offer; the client must stop at `limit` rows.
      const nextCursor = page < 3 ? `c${page + 1}` : null;
      return jsonResponse({ data, nextCursor });
    }),
  );
  return urls;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  urls: string[];
}

/** Run `8cli dt rows …` in-process with output, exit and requests captured. */
async function runDtRows(args: string[]): Promise<RunResult> {
  const urls = stubRowsFetch();
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
    registerDataTableCommands(program);
    await program.parseAsync(['--url', 'http://127.0.0.1:5678', '--api-key', 'test-key', ...args], {
      from: 'user',
    });
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout: out.join(''), stderr: err.join(''), exitCode, urls };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('dt rows --limit above the n8n page maximum (#41)', () => {
  it('--limit 500 pages at 250, follows the cursor, stops at 500 rows and trims the last page', async () => {
    const r = await runDtRows(['dt', 'rows', 'dt1', '--limit', '500']);

    expect(r.exitCode).toBe(0);
    expect(r.stderr).toBe('');

    // Pages of min(limit, 250) — never the raw --limit that n8n refuses.
    expect(r.urls).toHaveLength(2);
    expect(r.urls[0]).toContain('limit=250');
    expect(r.urls[1]).toContain('limit=250');

    // The cursor is followed, and the third page on offer is never requested.
    expect(r.urls[0]).not.toContain('cursor=');
    expect(r.urls[1]).toContain('cursor=c2');

    // 250 + 250 rows collected, merged and trimmed to exactly the requested 500.
    expect(JSON.parse(r.stdout)).toHaveLength(500);
  });

  it('trims the last page when it would overshoot the requested limit', async () => {
    // --limit 400 asks for pages of 250: two pages collect 500 rows, so the merge
    // must be cut back to 400 rather than returned whole.
    const r = await runDtRows(['dt', 'rows', 'dt1', '--limit', '400']);

    expect(r.exitCode).toBe(0);
    expect(r.urls).toHaveLength(2);
    expect(JSON.parse(r.stdout)).toHaveLength(400);
  });

  it('--limit 10 sends limit=10 in a single request and stops', async () => {
    const r = await runDtRows(['dt', 'rows', 'dt1', '--limit', '10']);

    expect(r.exitCode).toBe(0);
    expect(r.urls).toHaveLength(1);
    expect(r.urls[0]).toContain('limit=10');
    expect(r.urls[0]).not.toContain('cursor=');
    expect(JSON.parse(r.stdout)).toHaveLength(10);
  });
});
