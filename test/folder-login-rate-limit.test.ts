// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { InternalApiClient } from '../src/client/internal-api.js';
import { registerFolderCommands } from '../src/commands/folder.js';

// Regression coverage for #47. n8n 2.40.5 allows 5 internal logins per minute
// per client and answers the 6th `POST /rest/login` with 429 + `Retry-After:
// 60`. The internal client used to honour that header and retry in-process, so
// the 6th folder command in a minute stalled silently for 60 s (up to 3 min with
// the retry budget) and then reported the *next* request's failure under the
// command's own code. A rate-limited login must instead fail at once with
// `ERR_RATE_LIMITED`, carrying the server's `Retry-After` seconds.
//
// The fetch stub answers `POST /rest/login` with 429 for every attempt and
// records how many were made, and `setTimeout` is spied on so "no sleep" is
// asserted directly. Without the fix this test sees 4 login attempts and three
// 60 000 ms delays; with it, one attempt and no delay.
//
// The two cases at the end are guards, not the regression: they pass against
// the unfixed code too, and exist so the narrow fix cannot silence the internal
// client's retry for routes other than login, or break a successful login.

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Record every delay handed to `setTimeout`, firing the callback immediately. */
function trackTimers(): number[] {
  const delays: number[] = [];
  const realSetTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
    delays.push(ms ?? 0);
    return realSetTimeout(fn, 0);
  }) as typeof setTimeout);
  return delays;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('InternalApiClient login rate limit (#47)', () => {
  it('fails a 429 login at once with ERR_RATE_LIMITED and the Retry-After seconds', async () => {
    const delays = trackTimers();
    let loginCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        loginCalls += 1;
        return jsonResponse({ message: 'Too many requests' }, 429, { 'Retry-After': '60' });
      }),
    );

    const client = new InternalApiClient('https://n8n.example.com');
    const err = (await client.login('e2e@example.com', 'secret').catch((e: unknown) => e)) as {
      code?: string;
      retryAfter?: number;
    };

    expect(err.code).toBe('ERR_RATE_LIMITED');
    expect(err.retryAfter).toBe(60);
    expect(loginCalls).toBe(1); // no in-process retry of the login
    expect(delays).toEqual([]); // no sleep at all
  });
});

describe('folder command against a rate-limited login (#47)', () => {
  it('reports ERR_RATE_LIMITED on stderr, exit 1, without sleeping', async () => {
    const delays = trackTimers();
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        calls.push(`${init?.method ?? 'GET'} ${url.pathname}`);
        return jsonResponse({ message: 'Too many requests' }, 429, { 'Retry-After': '60' });
      }),
    );

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
      await program.parseAsync(['--url', 'http://127.0.0.1:5678', 'folder', 'tree'], {
        from: 'user',
      });
    } catch (e) {
      if (!(e instanceof ExitSignal)) throw e;
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      exitSpy.mockRestore();
    }

    expect(exitCode).toBe(1);
    const reported = JSON.parse(err.join('')) as {
      error: string;
      code: string;
      retryAfter: number;
    };
    expect(reported.code).toBe('ERR_RATE_LIMITED');
    expect(reported.error).toContain('60');
    expect(reported.retryAfter).toBe(60);
    expect(out.join('')).toBe('');
    expect(calls).toEqual(['POST /rest/login']); // one attempt, then stop
    expect(delays).toEqual([]);
  });
});

describe('internal API 429 handling outside login (guard)', () => {
  it('still retries a rate-limited non-login route', async () => {
    const delays = trackTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls < 2
          ? jsonResponse({}, 429, { 'Retry-After': '1' })
          : jsonResponse([{ id: 'p1', name: 'Personal', type: 'personal' }]);
      }),
    );

    const client = new InternalApiClient('https://n8n.example.com');
    await expect(client.getProjectId()).resolves.toBe('p1');

    expect(calls).toBe(2); // the retry is preserved for non-login routes
    expect(delays).toEqual([1000]);
  });

  it('still logs in successfully when n8n answers 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({})),
    );

    const client = new InternalApiClient('https://n8n.example.com');
    await client.login('e2e@example.com', 'secret');

    expect(client.isLoggedIn).toBe(true);
  });
});
