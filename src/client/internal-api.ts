// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { BaseClient, ApiRequestError } from './base.js';
import type { Folder } from '../types.js';

/**
 * Internal workflow type returned by /rest/workflows.
 * Includes parentFolder info not available via public API.
 */
export interface InternalWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  parentFolder?: { id: string } | null;
  [key: string]: unknown;
}

interface InternalProject {
  id: string;
  name: string;
  type: string;
}

/**
 * n8n internal API client.
 * Uses cookie-based session auth via POST /rest/login.
 */
export class InternalApiClient extends BaseClient {
  private cookies: string[] = [];
  private loggedIn = false;
  private cachedProjectId: string | undefined;

  constructor(baseUrl: string, verbose = false) {
    super(baseUrl, {}, verbose);
  }

  /**
   * Override request to inject cookie header on all requests.
   */
  protected override async request<T>(
    method: string,
    path: string,
    options: { params?: Record<string, string | number | boolean | undefined>; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const headers = { ...options.headers };
    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }

    const url = this.buildUrl(path, options.params);
    const allHeaders = { ...this.headers, ...headers };

    this.log(`${method} ${url}`);

    let retries = 0;
    const maxRetries = 3;

    while (true) {
      const response = await fetch(url, {
        method,
        headers: allHeaders,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        redirect: 'manual',
      });

      // Extract cookies from Set-Cookie headers
      const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
      if (setCookieHeaders.length > 0) {
        for (const setCookie of setCookieHeaders) {
          const cookiePart = setCookie.split(';')[0];
          if (cookiePart) {
            // Update or add cookie
            const cookieName = cookiePart.split('=')[0];
            this.cookies = this.cookies.filter(c => !c.startsWith(cookieName + '='));
            this.cookies.push(cookiePart);
          }
        }
      }

      // Handle rate limiting with retry
      if (response.status === 429 && retries < maxRetries) {
        retries++;
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, retries) * 1000;
        this.log(`Rate limited – retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        let errorBody: Record<string, unknown> | undefined;
        try {
          errorBody = await response.json() as Record<string, unknown>;
        } catch {
          // Response body is not JSON
        }

        throw new ApiRequestError({
          message: (errorBody?.message as string) || response.statusText || `HTTP ${response.status}`,
          statusCode: response.status,
          code: (errorBody?.code as string) || `ERR_HTTP_${response.status}`,
        });
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      const data = JSON.parse(text);
      this.log(`Response: ${response.status}`);
      return data as T;
    }
  }

  /**
   * Authenticate via POST /rest/login. Stores session cookies.
   */
  async login(email: string, password: string): Promise<void> {
    const result = await this.post<Record<string, unknown>>('/rest/login', {
      emailOrLdapLoginId: email,
      password,
    });

    if (!result) {
      throw new Error('Login returned empty response');
    }

    this.loggedIn = true;
    this.log('Logged in successfully');
  }

  /**
   * Ensure the client is logged in before making API calls.
   */
  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  /**
   * Discover the personal project ID (cached after first call).
   */
  async getProjectId(): Promise<string> {
    if (this.cachedProjectId) {
      return this.cachedProjectId;
    }

    const result = await this.get<InternalProject[] | { data: InternalProject[] }>('/rest/projects');
    const projects = Array.isArray(result) ? result : result.data;

    if (!projects || projects.length === 0) {
      throw new Error('No projects found');
    }

    // Prefer personal project
    const personal = projects.find(p => p.type === 'personal');
    this.cachedProjectId = personal ? personal.id : projects[0].id;
    return this.cachedProjectId;
  }

  /**
   * GET /rest/projects/{projectId}/folders – flat list of all folders.
   */
  async getFolders(): Promise<Folder[]> {
    const projectId = await this.getProjectId();
    const result = await this.get<Folder[] | { data: Folder[] }>(`/rest/projects/${projectId}/folders`);
    if (Array.isArray(result)) {
      return result;
    }
    return result.data ?? [];
  }

  /**
   * POST /rest/projects/{projectId}/folders – create a new folder.
   */
  async createFolder(name: string, parentFolderId?: string): Promise<Folder> {
    const projectId = await this.getProjectId();
    const payload: Record<string, string> = { name };
    if (parentFolderId) {
      payload.parentFolderId = parentFolderId;
    }
    return this.post<Folder>(`/rest/projects/${projectId}/folders`, payload);
  }

  /**
   * DELETE /rest/projects/{projectId}/folders/{folderId} – delete an empty folder.
   */
  async deleteFolder(folderId: string): Promise<void> {
    const projectId = await this.getProjectId();
    await this.delete<void>(`/rest/projects/${projectId}/folders/${folderId}`);
  }

  /**
   * GET /rest/workflows – list all workflows (internal API, includes parentFolder).
   */
  async getWorkflows(): Promise<InternalWorkflow[]> {
    const result = await this.get<InternalWorkflow[] | { data: InternalWorkflow[] }>('/rest/workflows');
    if (Array.isArray(result)) {
      return result;
    }
    return result.data ?? [];
  }

  /**
   * GET /rest/workflows/{id} – full workflow detail (includes parentFolder).
   */
  async getWorkflow(id: string): Promise<InternalWorkflow> {
    return this.get<InternalWorkflow>(`/rest/workflows/${id}`);
  }

  /**
   * PATCH /rest/workflows/{id} – move workflow to a folder.
   */
  async moveWorkflow(id: string, parentFolderId: string | null): Promise<InternalWorkflow> {
    return this.patch<InternalWorkflow>(`/rest/workflows/${id}`, { parentFolderId });
  }
}
