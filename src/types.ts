// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// ── Config ──────────────────────────────────────────────────────────────────

export interface Config {
  /** n8n instance URL (no trailing slash) */
  url: string;
  /** Public API key */
  apiKey: string;
  /** Email for internal API auth (optional) */
  email?: string;
  /** Password for internal API auth (optional) */
  password?: string;
  /** Directory to save/load workflow JSON files */
  workflowDir: string;
  /** Output format */
  table: boolean;
  /** Dry-run mode – preview changes without applying */
  dry: boolean;
  /** Verbose logging */
  verbose: boolean;
}

// ── API error ───────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  statusCode: number;
  code: string;
}

// ── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

// ── Output ──────────────────────────────────────────────────────────────────

export interface OutputOptions {
  table: boolean;
  columns?: ColumnDef[];
}

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown) => string;
}

// ── n8n resource types ──────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
  nodes?: WorkflowNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: unknown;
  pinData?: Record<string, unknown>;
  versionId?: string;
  meta?: Record<string, unknown>;
}

export interface WorkflowNode {
  id?: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
}

export interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
  data?: Record<string, unknown>;
  retryOf?: string;
  retrySuccessId?: string;
  workflowData?: Workflow;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

export interface Tag {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Variable {
  id: string;
  key: string;
  value: string;
  type: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt?: string;
  isPending?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentFolderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataTable {
  id: string;
  name: string;
  columns: DataTableColumn[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DataTableColumn {
  id: string;
  name: string;
  dataType: string;
}

export interface DataTableRow {
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  risk: string;
  sections: Record<string, unknown>;
}

export interface SourceControlStatus {
  branchName?: string;
  connected?: boolean;
  ahead?: number;
  behind?: number;
}
