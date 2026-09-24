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
//
// Issue #72: n8n 2.40.5 answers a *missing workflow* on `/publish` and `/unpublish` with
// 404 too, so a bare "404 means the route is absent" rule costs a bad id a second request
// and, once n8n removes the old routes, would report a route error instead of the
// workflow-not-found one. The fallback therefore fires on 405, or on a 404 whose body is
// not n8n's missing-workflow JSON. These exact bodies were measured live on a throwaway
// n8nio/n8n:2.40.5 container:
//   POST /api/v1/workflows/doesNotExist123/publish   -> 404 {"message":"You do not have permission to activate this workflow. Ask the owner to share it with you."}
//   POST /api/v1/workflows/doesNotExist123/unpublish -> 404 {"message":"You do not have permission to deactivate this workflow. Ask the owner to share it with you."}
const NOT_FOUND = {
  publish:
    'You do not have permission to activate this workflow. Ask the owner to share it with you.',
  unpublish:
    'You do not have permission to deactivate this workflow. Ask the owner to share it with you.',
} as const;

type Verb = keyof typeof NOT_FOUND;
const VERBS = Object.keys(NOT_FOUND) as Verb[];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Stub `fetch` so the first request answers `first` and every later request answers 200
 * with the workflow. Returns the requested URLs in order, so a test can tell whether the
 * deprecated route was tried.
 */
function stubFetch(first: Response, workflow: { id: string; active: boolean }): string[] {
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      urls.push(url.toString());
      return urls.length === 1 ? first : jsonResponse({ name: 'wf', ...workflow });
    }),
  );
  return urls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PublicApiClient activate/deactivate endpoints (#44, #72)', () => {
  for (const verb of VERBS) {
    const action = verb === 'publish' ? 'activate' : 'deactivate';
    const workflow = { id: 'wf1', active: verb === 'publish' };
    const current = `https://n8n.example.com/api/v1/workflows/wf1/${verb}`;
    const deprecated = `https://n8n.example.com/api/v1/workflows/wf1/${action}`;
    const call = (client: PublicApiClient) =>
      verb === 'publish' ? client.activateWorkflow('wf1') : client.deactivateWorkflow('wf1');

    it(`${action} calls POST /${verb} and not the deprecated /${action}`, async () => {
      const urls = stubFetch(jsonResponse({ name: 'wf', ...workflow }), workflow);

      const client = new PublicApiClient('https://n8n.example.com', 'key');
      const result = await call(client);

      expect(result).toMatchObject(workflow);
      expect(urls).toEqual([current]);
    });

    it(`${action} falls back to /${action} when /${verb} is not served (405 on n8n 2.25.7)`, async () => {
      const urls = stubFetch(jsonResponse({ message: 'POST method not allowed' }, 405), workflow);

      const client = new PublicApiClient('https://n8n.example.com', 'key');
      const result = await call(client);

      expect(result).toMatchObject(workflow);
      expect(urls).toEqual([current, deprecated]);
    });

    // #72, the regression this file was extended for: a bad id is not a missing route.
    it(`${action} does not fall back when a 404 body is n8n's missing-workflow JSON (#72)`, async () => {
      const urls = stubFetch(jsonResponse({ message: NOT_FOUND[verb] }, 404), workflow);

      const client = new PublicApiClient('https://n8n.example.com', 'key');
      const err = await call(client).then(
        () => undefined,
        (e: unknown) => e,
      );

      // The workflow-not-found error n8n itself sent; the command maps it to
      // ERR_WORKFLOW_ACTIVATE / ERR_WORKFLOW_DEACTIVATE exactly as before.
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).statusCode).toBe(404);
      expect((err as ApiRequestError).message).toBe(NOT_FOUND[verb]);
      expect(urls).toEqual([current]);
    });

    it(`${action} falls back on a 404 whose body is not n8n's missing-workflow JSON`, async () => {
      // A proxy in front of a server without the route: 404, but not n8n's not-found body.
      const urls = stubFetch(jsonResponse({ message: 'Not Found' }, 404), workflow);

      const client = new PublicApiClient('https://n8n.example.com', 'key');
      const result = await call(client);

      expect(result).toMatchObject(workflow);
      expect(urls).toEqual([current, deprecated]);
    });

    // Guard: passes with and without the #44/#72 fixes. It locks the boundary the fallback
    // must not cross – a real refusal (400/403/409) is not a missing route, so it surfaces
    // at once with no second request to the deprecated endpoint.
    it(`${action} does not fall back on a real refusal (400)`, async () => {
      const urls = stubFetch(
        jsonResponse(
          {
            message: `Workflow cannot be ${action}d because it has no trigger node.`,
          },
          400,
        ),
        workflow,
      );

      const client = new PublicApiClient('https://n8n.example.com', 'key');
      await expect(call(client)).rejects.toBeInstanceOf(ApiRequestError);

      expect(urls).toEqual([current]);
    });
  }
});
