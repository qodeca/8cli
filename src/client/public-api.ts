// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { ApiRequestError, BaseClient } from './base.js';
import type {
  Workflow,
  Execution,
  Credential,
  Tag,
  Variable,
  Project,
  User,
  AuditEntry,
  SourceControlStatus,
  DataTable,
  DataTableRow,
} from '../types.js';

/**
 * n8n caps the `limit` query parameter on the data-table rows route at 250;
 * above it the route answers `400 request/query/limit must be <= 250`.
 */
const DATA_TABLE_ROWS_PAGE_MAX = 250;

/**
 * n8n 2.40.5 answers a *missing workflow* on `POST /workflows/{id}/publish` and
 * `/unpublish` with 404 and this body (measured on a throwaway 2.40.5 container):
 *
 *   publish   -> {"message":"You do not have permission to activate this workflow. Ask the owner to share it with you."}
 *   unpublish -> {"message":"You do not have permission to deactivate this workflow. Ask the owner to share it with you."}
 *
 * That is n8n's not-found JSON for these routes, not a missing route, so it must not
 * trigger the deprecated-route fallback (#72): a bad id would otherwise cost a second
 * request and, once n8n removes the old routes, end in a misleading route error. n8n's own
 * body for a route it does not serve is 405 (`POST method not allowed`); a proxy in front of
 * an older server can answer 404 with any other body.
 */
const WORKFLOW_NOT_FOUND: Record<'publish' | 'unpublish', string> = {
  publish:
    'You do not have permission to activate this workflow. Ask the owner to share it with you.',
  unpublish:
    'You do not have permission to deactivate this workflow. Ask the owner to share it with you.',
};

/**
 * Whether a failed current-route request means the route itself is absent, so the deprecated
 * route should be tried: a 405, or a 404 whose body is not n8n's missing-workflow JSON. Every
 * other failure – a 404 that is n8n reporting the workflow missing, or a real refusal
 * (400/403/409) – is a real answer and is surfaced as-is.
 */
function isMissingRoute(err: unknown, route: 'publish' | 'unpublish'): boolean {
  if (!(err instanceof ApiRequestError)) return false;
  if (err.statusCode === 405) return true;
  return err.statusCode === 404 && err.message !== WORKFLOW_NOT_FOUND[route];
}

/**
 * n8n Public API client.
 * Uses X-N8N-API-KEY header for authentication.
 *
 * Method stubs are defined here – actual implementations will be
 * added in Tasks 2–8.
 */
export class PublicApiClient extends BaseClient {
  constructor(baseUrl: string, apiKey: string, verbose = false) {
    super(baseUrl, { 'X-N8N-API-KEY': apiKey }, verbose);
  }

  // ── Workflows ───────────────────────────────────────────────────────────

  async listWorkflows(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Workflow[]> {
    return this.paginateAll<Workflow>('/api/v1/workflows', params);
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.get<Workflow>(`/api/v1/workflows/${id}`);
  }

  async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    return this.post<Workflow>('/api/v1/workflows', data);
  }

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    return this.put<Workflow>(`/api/v1/workflows/${id}`, data);
  }

  async deleteWorkflow(id: string): Promise<Workflow> {
    return this.delete<Workflow>(`/api/v1/workflows/${id}`);
  }

  /**
   * Publish (activate) a workflow.
   *
   * n8n 2.40 added `POST /workflows/{id}/publish` and deprecated `/activate`. Older n8n
   * (2.25.7, measured on a throwaway container) has no `/publish` route at all and answers
   * 405 "POST method not allowed"; a proxy in front of it can answer 404 instead. So the
   * current route is tried first, and the deprecated one is a fallback only when the route
   * itself is absent – a 405, or a 404 that is not n8n's missing-workflow JSON (#72). A real
   * refusal (400/403/409), and a 404 for a workflow that does not exist, are not retried.
   */
  async activateWorkflow(id: string): Promise<Workflow> {
    try {
      return await this.post<Workflow>(`/api/v1/workflows/${id}/publish`);
    } catch (err) {
      if (!isMissingRoute(err, 'publish')) throw err;
      return this.post<Workflow>(`/api/v1/workflows/${id}/activate`);
    }
  }

  /**
   * Unpublish (deactivate) a workflow.
   *
   * Mirrors `activateWorkflow`: n8n 2.40 added `/unpublish` and deprecated `/deactivate`,
   * and pre-2.40 answers 405 (or 404 behind a proxy) for the route that does not exist yet.
   * A 404 for a workflow that does not exist is n8n's answer, not a missing route (#72).
   */
  async deactivateWorkflow(id: string): Promise<Workflow> {
    try {
      return await this.post<Workflow>(`/api/v1/workflows/${id}/unpublish`);
    } catch (err) {
      if (!isMissingRoute(err, 'unpublish')) throw err;
      return this.post<Workflow>(`/api/v1/workflows/${id}/deactivate`);
    }
  }

  async transferWorkflow(id: string, destinationProjectId: string): Promise<void> {
    return this.put<void>(`/api/v1/workflows/${id}/transfer`, { destinationProjectId });
  }

  async getWorkflowTags(id: string): Promise<Tag[]> {
    return this.get<Tag[]>(`/api/v1/workflows/${id}/tags`);
  }

  async updateWorkflowTags(id: string, tagIds: Array<{ id: string }>): Promise<Tag[]> {
    return this.put<Tag[]>(`/api/v1/workflows/${id}/tags`, tagIds);
  }

  // ── Executions ──────────────────────────────────────────────────────────

  async listExecutions(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Execution[]> {
    return this.paginateAll<Execution>('/api/v1/executions', params);
  }

  async getExecution(
    id: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Execution> {
    return this.get<Execution>(`/api/v1/executions/${id}`, { params });
  }

  async deleteExecution(id: string): Promise<Execution> {
    return this.delete<Execution>(`/api/v1/executions/${id}`);
  }

  // ── Credentials ─────────────────────────────────────────────────────────

  async listCredentials(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Credential[]> {
    return this.paginateAll<Credential>('/api/v1/credentials', params);
  }

  async createCredential(data: Partial<Credential>): Promise<Credential> {
    return this.post<Credential>('/api/v1/credentials', data);
  }

  async deleteCredential(id: string): Promise<Credential> {
    return this.delete<Credential>(`/api/v1/credentials/${id}`);
  }

  async transferCredential(id: string, destinationProjectId: string): Promise<void> {
    return this.put<void>(`/api/v1/credentials/${id}/transfer`, { destinationProjectId });
  }

  // ── Tags ────────────────────────────────────────────────────────────────

  async listTags(params?: Record<string, string | number | boolean | undefined>): Promise<Tag[]> {
    return this.paginateAll<Tag>('/api/v1/tags', params);
  }

  async createTag(name: string): Promise<Tag> {
    return this.post<Tag>('/api/v1/tags', { name });
  }

  async updateTag(id: string, name: string): Promise<Tag> {
    return this.put<Tag>(`/api/v1/tags/${id}`, { name });
  }

  async deleteTag(id: string): Promise<void> {
    return this.delete<void>(`/api/v1/tags/${id}`);
  }

  // ── Variables ───────────────────────────────────────────────────────────

  async listVariables(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Variable[]> {
    return this.paginateAll<Variable>('/api/v1/variables', params);
  }

  async createVariable(data: { key: string; value: string; type?: string }): Promise<Variable> {
    return this.post<Variable>('/api/v1/variables', data);
  }

  async deleteVariable(id: string): Promise<void> {
    return this.delete<void>(`/api/v1/variables/${id}`);
  }

  // ── Projects ────────────────────────────────────────────────────────────

  async listProjects(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Project[]> {
    return this.paginateAll<Project>('/api/v1/projects', params);
  }

  async createProject(name: string): Promise<Project> {
    return this.post<Project>('/api/v1/projects', { name });
  }

  async updateProject(id: string, name: string): Promise<Project> {
    return this.put<Project>(`/api/v1/projects/${id}`, { name });
  }

  async deleteProject(id: string, transferToProjectId?: string): Promise<void> {
    const params = transferToProjectId ? { transferId: transferToProjectId } : undefined;
    return this.delete<void>(`/api/v1/projects/${id}`, { params });
  }

  // ── Users ───────────────────────────────────────────────────────────────

  async listUsers(params?: Record<string, string | number | boolean | undefined>): Promise<User[]> {
    // n8n returns `role` only when includeRole=true is sent (#40).
    return this.paginateAll<User>('/api/v1/users', { ...params, includeRole: true });
  }

  async getUser(id: string): Promise<User> {
    // n8n returns `role` only when includeRole=true is sent (#40).
    return this.get<User>(`/api/v1/users/${id}`, { params: { includeRole: true } });
  }

  // ── Audit ───────────────────────────────────────────────────────────────

  async generateAudit(params?: Record<string, unknown>): Promise<AuditEntry> {
    return this.post<AuditEntry>('/api/v1/audit', params);
  }

  // ── Source control ──────────────────────────────────────────────────────

  async getSourceControlStatus(direction: 'pull' | 'push'): Promise<SourceControlStatus> {
    return this.get<SourceControlStatus>('/api/v1/source-control/status', {
      params: { direction },
    });
  }

  async pullFromSourceControl(force?: boolean): Promise<unknown> {
    return this.post('/api/v1/source-control/pull', { force });
  }

  // ── Data tables ─────────────────────────────────────────────────────────

  async listDataTables(): Promise<DataTable[]> {
    return this.paginateAll<DataTable>('/api/v1/data-tables');
  }

  async getDataTable(id: string): Promise<DataTable> {
    return this.get<DataTable>(`/api/v1/data-tables/${id}`);
  }

  async createDataTable(data: {
    name: string;
    columns: Array<{ name: string; type: string }>;
  }): Promise<DataTable> {
    return this.post<DataTable>('/api/v1/data-tables', data);
  }

  async deleteDataTable(id: string): Promise<void> {
    return this.delete<void>(`/api/v1/data-tables/${id}`);
  }

  /**
   * List rows of a data table.
   *
   * `limit` means "maximum rows to return", but n8n caps the query parameter at
   * 250, so it cannot be sent through as the page size: above the cap the route
   * answers `400 request/query/limit must be <= 250` (#41). Request pages of
   * `min(limit, 250)` instead and stop once `limit` rows are collected, trimming
   * the last page. Without a numeric `limit` the old full-pagination behaviour is
   * kept.
   */
  async listDataTableRows(
    id: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<DataTableRow[]> {
    const path = `/api/v1/data-tables/${id}/rows`;
    const limit = params?.limit;
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
      return this.paginateAll<DataTableRow>(path, params);
    }

    const pageSize = Math.min(limit, DATA_TABLE_ROWS_PAGE_MAX);
    const rows: DataTableRow[] = [];
    for await (const page of this.paginate<DataTableRow>(path, { ...params, limit: pageSize })) {
      rows.push(...page);
      if (rows.length >= limit) break;
    }
    return rows.slice(0, limit);
  }

  async insertDataTableRows(
    id: string,
    rows: DataTableRow[],
  ): Promise<{ success: boolean; insertedRows: number }> {
    return this.post<{ success: boolean; insertedRows: number }>(`/api/v1/data-tables/${id}/rows`, {
      data: rows,
    });
  }
}
