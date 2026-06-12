import { Tablet, TabletState } from "../types";
import { SqlSandboxUI } from "./SqlSandboxUI";
import { SqlSandboxTabletState, RegisteredSource, SqlSandboxSourceKind } from "./sqlSandboxTypes";
import { detectSourceKind, sanitizeIdentifier } from "./engine/sourceRegistry";

const initialQuery = "SELECT 1 AS ready;";

function createSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sqlsandbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const SqlSandboxTablet: Tablet = {
  id: "sqlsandbox",
  label: "SQL Sandbox",
  description: "Query local CSV, JSON, NDJSON, and Parquet files with DuckDB in your browser.",
  keywords: ["sql", "duckdb", "csv", "json", "ndjson", "parquet", "query", "data", "offline"],

  createInitialState(payload?: { content?: string; title?: string; format?: string }): SqlSandboxTabletState {
    const sessionId = createSessionId();
    let sources: RegisteredSource[] = [];
    let query = initialQuery;

    if (payload && payload.content) {
      const title = payload.title || "data.csv";
      const kind = (payload.format || detectSourceKind(title) || "csv") as SqlSandboxSourceKind;
      const tableName = sanitizeIdentifier(title);
      const id = `${tableName}-${sessionId}`;
      const source: RegisteredSource = {
        id,
        name: title,
        tableName,
        kind,
        size: payload.content.length,
        persistedContent: {
          encoding: "text",
          content: payload.content,
          size: payload.content.length,
        },
        restoreStatus: "available",
      };
      sources = [source];
      query = `SELECT * FROM "${tableName}" LIMIT 100;`;
    }

    return {
      type: "sqlsandbox",
      data: {
        sessionId,
        query,
        sources,
        schema: {
          sources,
          tables: [],
          views: [],
        },
        history: [],
        snapshots: [],
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const state = JSON.parse(json) as SqlSandboxTabletState;
    return {
      ...state,
      data: {
        ...state.data,
        sessionId: state.data.sessionId ?? createSessionId(),
      },
    };
  },

  render(state: SqlSandboxTabletState, onChange) {
    return <SqlSandboxUI state={state} onChange={onChange} />;
  },
};

export default SqlSandboxTablet;
