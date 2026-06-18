// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { BaseClient } from './base.js';
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

  async activateWorkflow(id: string): Promise<Workflow> {
    return this.post<Workflow>(`/api/v1/workflows/${id}/activate`);
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    return this.post<Workflow>(`/api/v1/workflows/${id}/deactivate`);
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
    return this.paginateAll<User>('/api/v1/users', params);
  }

  async getUser(id: string): Promise<User> {
    return this.get<User>(`/api/v1/users/${id}`);
  }

  // ── Audit ───────────────────────────────────────────────────────────────

  async generateAudit(params?: Record<string, unknown>): Promise<AuditEntry> {
    return this.post<AuditEntry>('/api/v1/audit', params);
  }

  // ── Source control ──────────────────────────────────────────────────────

  async getSourceControlStatus(): Promise<SourceControlStatus> {
    return this.get<SourceControlStatus>('/api/v1/source-control/preferences');
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

  async listDataTableRows(
    id: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<DataTableRow[]> {
    return this.paginateAll<DataTableRow>(`/api/v1/data-tables/${id}/rows`, params);
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
