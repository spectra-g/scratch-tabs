import { TabletState } from "../types";

export type SqlSandboxSourceKind = "csv" | "tsv" | "json" | "ndjson" | "parquet";

export type ExportFormat = "csv" | "json";

export interface SqlSandboxSource {
  id: string;
  name: string;
  tableName: string;
  kind: SqlSandboxSourceKind;
  size: number;
  file?: File;
  text?: string;
}

export interface RegisteredSource {
  id: string;
  name: string;
  tableName: string;
  kind: SqlSandboxSourceKind;
  size: number;
  rowCount?: number;
  persistedContent?: PersistedSourceContent;
  restoreStatus?: "available" | "too-large" | "unsupported";
}

export interface PersistedSourceContent {
  encoding: "text";
  content: string;
  size: number;
}

export interface SandboxColumn {
  name: string;
  engineType: string;
  friendlyType: string;
  nullable?: boolean;
  sampleValues?: unknown[];
}

export interface SandboxTable {
  name: string;
  type: "table" | "view";
  columns: SandboxColumn[];
  rowCount?: number;
  sourceId?: string;
}

export interface SandboxSchema {
  sources: RegisteredSource[];
  tables: SandboxTable[];
  views: SandboxTable[];
}

export interface QueryExecutionResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
  executionMs: number;
  error?: SqlExecutionError;
  truncated?: boolean;
}

export interface SqlExecutionError {
  message: string;
  line?: number;
  column?: number;
  sql?: string;
}

export interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: number;
  executionMs: number;
  rowCount: number;
  error?: string;
}

export interface SqlSandboxSnapshot {
  id: string;
  name: string;
  createdAt: number;
  sql: string;
}

export interface SqlSandboxEngine {
  init(): Promise<void>;
  registerSource(source: SqlSandboxSource): Promise<RegisteredSource>;
  renameSource(sourceId: string, newTableName: string): Promise<RegisteredSource>;
  dropSource(sourceId: string): Promise<void>;
  execute(sql: string): Promise<QueryExecutionResult>;
  getSchema(): Promise<SandboxSchema>;
  exportResult(result: QueryExecutionResult, format: ExportFormat): Promise<Blob>;
  createSnapshot?(name?: string): Promise<SqlSandboxSnapshot>;
  restoreSnapshot?(snapshotId: string): Promise<void>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export interface SqlSandboxData {
  sessionId: string;
  query: string;
  sources: RegisteredSource[];
  schema: SandboxSchema;
  history: QueryHistoryItem[];
  snapshots: SqlSandboxSnapshot[];
}

export interface SqlSandboxTabletState extends TabletState {
  type: "sqlsandbox";
  data: SqlSandboxData;
}
