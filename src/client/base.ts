// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import type { ApiError, PaginatedResponse } from '../types.js';

export class ApiRequestError extends Error {
  public statusCode: number;
  public code: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.statusCode = apiError.statusCode;
    this.code = apiError.code;
  }

  toJSON(): ApiError {
    return {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
    };
  }
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export class BaseClient {
  protected baseUrl: string;
  protected headers: Record<string, string>;
  protected verbose: boolean;

  constructor(baseUrl: string, headers: Record<string, string> = {}, verbose = false) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };
    this.verbose = verbose;
  }

  protected buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  protected log(message: string): void {
    if (this.verbose) {
      process.stderr.write(`[8cli] ${message}\n`);
    }
  }

  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.headers, ...options.headers };

    this.log(`${method} ${url}`);

    let retries = 0;
    const maxRetries = 3;

    while (true) {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      // Handle rate limiting with retry
      if (response.status === 429 && retries < maxRetries) {
        retries++;
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, retries) * 1000;
        this.log(`Rate limited – retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        let errorBody: Record<string, unknown> | undefined;
        try {
          errorBody = (await response.json()) as Record<string, unknown>;
        } catch {
          // Response body is not JSON
        }

        throw new ApiRequestError({
          message:
            (errorBody?.message as string) || response.statusText || `HTTP ${response.status}`,
          statusCode: response.status,
          code: (errorBody?.code as string) || `ERR_HTTP_${response.status}`,
        });
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      this.log(`Response: ${response.status}`);
      return data as T;
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Async generator for cursor-based pagination.
   */
  async *paginate<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;

    do {
      const queryParams = { ...params, ...(cursor ? { cursor } : {}) };
      const response = await this.get<PaginatedResponse<T>>(path, { params: queryParams });
      yield response.data;
      cursor = response.nextCursor;
    } while (cursor);
  }

  /**
   * Collect all pages into a single array.
   */
  async paginateAll<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T[]> {
    const results: T[] = [];
    for await (const page of this.paginate<T>(path, params)) {
      results.push(...page);
    }
    return results;
  }
}
