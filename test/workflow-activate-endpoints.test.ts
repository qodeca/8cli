// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApiClient } from '../src/client/public-api.js';
import { ApiRequestError } from '../src/client/base.js';

// Regression coverage for issue #44: `wf activate` / `wf deactivate` called n8n's
// deprecated `POST /workflows/{id}/activate` and `/deactivate`. n8n 2.40 marks both
// deprecated and serves `/publish` and `/unpublish` instead; n8n 2.25.7 has no `/publish`
// route at all and answers 405 (measured on a throwaway container). So the current
// endpoint is tried first and the deprecated one is only a fallback when the route is
// absent. The live 2.40.5 behaviour is locked e2e by
// test/e2e/workflow.e2e.ts ("uses the non-deprecated /publish and /unpublish endpoints").

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PublicApiClient activate/deactivate endpoints (#44)', () => {
  it('activate calls POST /publish and not the deprecated /activate', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(url.toString());
        return jsonResponse({ id: 'wf1', name: 'wf', active: true });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const result = await client.activateWorkflow('wf1');

    expect(result).toMatchObject({ id: 'wf1', active: true });
    expect(urls).toEqual(['https://n8n.example.com/api/v1/workflows/wf1/publish']);
  });

  it('deactivate calls POST /unpublish and not the deprecated /deactivate', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(url.toString());
        return jsonResponse({ id: 'wf1', name: 'wf', active: false });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const result = await client.deactivateWorkflow('wf1');

    expect(result).toMatchObject({ id: 'wf1', active: false });
    expect(urls).toEqual(['https://n8n.example.com/api/v1/workflows/wf1/unpublish']);
  });

  it('activate falls back to /activate when /publish is not served (405 on n8n 2.25.7)', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = url.toString();
        urls.push(href);
        return href.endsWith('/publish')
          ? jsonResponse({ message: 'POST method not allowed' }, 405)
          : jsonResponse({ id: 'wf1', name: 'wf', active: true });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const result = await client.activateWorkflow('wf1');

    expect(result).toMatchObject({ active: true });
    expect(urls).toEqual([
      'https://n8n.example.com/api/v1/workflows/wf1/publish',
      'https://n8n.example.com/api/v1/workflows/wf1/activate',
    ]);
  });

  it('deactivate falls back to /deactivate when /unpublish is not served', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = url.toString();
        urls.push(href);
        return href.endsWith('/unpublish')
          ? jsonResponse({ message: 'POST method not allowed' }, 405)
          : jsonResponse({ id: 'wf1', name: 'wf', active: false });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const result = await client.deactivateWorkflow('wf1');

    expect(result).toMatchObject({ active: false });
    expect(urls).toEqual([
      'https://n8n.example.com/api/v1/workflows/wf1/unpublish',
      'https://n8n.example.com/api/v1/workflows/wf1/deactivate',
    ]);
  });

  it('activate falls back when a proxy answers 404 for the absent /publish route', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = url.toString();
        urls.push(href);
        return href.endsWith('/publish')
          ? jsonResponse({ message: 'Not Found' }, 404)
          : jsonResponse({ id: 'wf1', name: 'wf', active: true });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const result = await client.activateWorkflow('wf1');

    expect(result).toMatchObject({ active: true });
    expect(urls).toHaveLength(2);
  });

  // Guard: this passes with and without the #44 fix. It locks the boundary the fallback
  // must not cross – a real refusal (400/403/409) is not a missing route, so it surfaces
  // at once with no second request to the deprecated endpoint.
  it('does not fall back on a real refusal (no trigger node, 400)', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(url.toString());
        return jsonResponse(
          {
            message:
              'Workflow cannot be activated because it has no trigger node. At least one trigger, webhook, or polling node is required.',
          },
          400,
        );
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    await expect(client.activateWorkflow('wf1')).rejects.toBeInstanceOf(ApiRequestError);

    expect(urls).toHaveLength(1);
  });
});
