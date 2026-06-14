// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApiClient } from '../src/client/public-api.js';
import { ApiRequestError } from '../src/client/base.js';

// The 429 retry/backoff in BaseClient is exercised here as a unit test (with
// faked timers) rather than e2e, so the suite never waits on real backoff.

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BaseClient 429 handling', () => {
  it('retries on 429 and resolves once the server returns 200', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls < 3 ? new Response('', { status: 429 }) : jsonResponse([{ id: '1' }]);
      }),
    );
    vi.useFakeTimers();

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const promise = client.get<Array<{ id: string }>>('/api/v1/workflows');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(calls).toBe(3); // two 429s + one success
    expect(result).toEqual([{ id: '1' }]);
  });

  it('throws an ApiRequestError after the retry budget is exhausted', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return new Response(JSON.stringify({ message: 'rate limited' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
    vi.useFakeTimers();

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const promise = client.get('/api/v1/workflows');
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiRequestError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(calls).toBe(4); // initial attempt + 3 retries
  });

  it('honours a numeric Retry-After header', async () => {
    const delays: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0);
      return realSetTimeout(fn, 0);
    }) as typeof setTimeout);

    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls < 2
          ? new Response('', { status: 429, headers: { 'Retry-After': '2' } })
          : jsonResponse({ ok: true });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    await client.get('/api/v1/workflows');

    expect(delays[0]).toBe(2000); // Retry-After: 2 seconds
  });
});
