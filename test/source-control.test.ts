// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { PublicApiClient } from '../src/client/public-api.js';
import { registerSourceControlCommands } from '../src/commands/source-control.js';

// Regression coverage for #39: `sc status` called GET /api/v1/source-control/preferences,
// a route n8n does not have, so it always failed with a 404 "not found" instead of reaching
// the licence gate. The unit test below pins the route and its required `direction` query
// param, which the old code did not send at all.

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Stub global fetch, returning one response and recording every requested URL. */
function stubFetch(response: Response): string[] {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return response;
    }),
  );
  return calls;
}

/** Thrown by the process.exit stub so an action's outputError stops the action. */
class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

/** Run `8cli sc status <args>` in-process with exit and stderr captured. */
async function runScStatus(args: string[]): Promise<{ stderr: string; exitCode: number }> {
  const chunks: string[] = [];
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  let exitCode = 0;
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCode = code ?? 0;
    throw new ExitSignal(exitCode);
  }) as never);

  try {
    const program = new Command();
    program.option('--url <url>').option('--api-key <key>').option('--verbose');
    registerSourceControlCommands(program);
    await program.parseAsync(
      ['--url', 'http://127.0.0.1:5678', '--api-key', 'test-key', 'sc', 'status', ...args],
      { from: 'user' },
    );
  } catch (err) {
    if (!(err instanceof ExitSignal)) throw err;
  } finally {
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stderr: chunks.join(''), exitCode };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PublicApiClient.getSourceControlStatus', () => {
  it('requests GET /api/v1/source-control/status with the required direction (#39)', async () => {
    const calls = stubFetch(jsonResponse({ data: [] }));
    const client = new PublicApiClient('https://n8n.example.com', 'key');

    await client.getSourceControlStatus('pull');

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]);
    expect(url.pathname).toBe('/api/v1/source-control/status');
    expect(url.searchParams.get('direction')).toBe('pull');
  });

  it('sends direction=push when asked', async () => {
    const calls = stubFetch(jsonResponse({ data: [] }));
    const client = new PublicApiClient('https://n8n.example.com', 'key');

    await client.getSourceControlStatus('push');

    expect(new URL(calls[0]).searchParams.get('direction')).toBe('push');
  });
});

describe('sc status --direction', () => {
  it('defaults to direction=pull and surfaces the n8n licence gate', async () => {
    const calls = stubFetch(
      jsonResponse({ message: 'Your license does not allow for feat:sourceControl.' }, 403),
    );

    const { stderr, exitCode } = await runScStatus([]);

    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stderr) as { error: string; code: string };
    expect(parsed.code).toBe('ERR_SOURCE_CONTROL');
    expect(parsed.error).toMatch(/license/i);
    expect(new URL(calls[0]).searchParams.get('direction')).toBe('pull');
  });

  it('rejects an unknown direction with a structured ERR_USAGE error and no request', async () => {
    const calls = stubFetch(jsonResponse({}));

    const { stderr, exitCode } = await runScStatus(['--direction', 'sideways']);

    expect(calls).toHaveLength(0);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stderr) as { error: string; code: string };
    expect(parsed.code).toBe('ERR_USAGE');
    expect(parsed.error).toContain('sideways');
  });
});
