import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import {
  ExportFormat,
  QueryExecutionResult,
  RegisteredSource,
  SandboxSchema,
  SandboxTable,
  SqlExecutionError,
  SqlSandboxEngine,
  SqlSandboxSource,
} from "../sqlSandboxTypes";
import { createExportBlob } from "./exportResults";
import { normalizeSchemaColumns } from "./inferSchema";
import { createRegisteredSource, quoteIdentifier } from "./sourceRegistry";

const DISPLAY_ROW_LIMIT = 5000;

export class DuckDbSandboxEngine implements SqlSandboxEngine {
  private db: duckdb.AsyncDuckDB | null = null;
  private connection: duckdb.AsyncDuckDBConnection | null = null;
  private worker: Worker | null = null;
  private sources = new Map<string, RegisteredSource>();

  async init(): Promise<void> {
    if (this.db && this.connection) {
      return;
    }

    const bundles: duckdb.DuckDBBundles = {
      mvp: {
        mainModule: duckdbWasm,
        mainWorker: mvpWorker,
      },
      eh: {
        mainModule: duckdbEhWasm,
        mainWorker: ehWorker,
      },
    };
    const bundle = await duckdb.selectBundle(bundles);
    this.worker = new Worker(bundle.mainWorker!);
    this.db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), this.worker);
    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    this.connection = await this.db.connect();
  }

  async registerSource(source: SqlSandboxSource): Promise<RegisteredSource> {
    await this.ensureReady();
    const db = this.db!;
    const connection = this.connection!;
    const fileName = `${source.id}.${source.kind}`;

    if (source.file) {
      await db.registerFileHandle(
        fileName,
        source.file,
        duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
        true,
      );
    } else if (source.text !== undefined) {
      await db.registerFileText(fileName, source.text);
    } else {
      throw new Error("Source must include a File or text payload");
    }

    const quotedTable = quoteIdentifier(source.tableName);
    const quotedPath = `'${fileName.replace(/'/g, "''")}'`;

    if (source.kind === "csv" || source.kind === "tsv") {
      const delimiter = source.kind === "tsv" ? "\\t" : ",";
      await connection.query(
        `CREATE OR REPLACE VIEW ${quotedTable} AS SELECT * FROM read_csv_auto(${quotedPath}, header = true, delim = '${delimiter}');`,
      );
    } else if (source.kind === "json") {
      await connection.query(
        `CREATE OR REPLACE VIEW ${quotedTable} AS SELECT * FROM read_json_auto(${quotedPath});`,
      );
    } else if (source.kind === "ndjson") {
      await connection.query(
        `CREATE OR REPLACE VIEW ${quotedTable} AS SELECT * FROM read_json_auto(${quotedPath}, format = 'newline_delimited');`,
      );
    } else {
      await connection.query(
        `CREATE OR REPLACE VIEW ${quotedTable} AS SELECT * FROM read_parquet(${quotedPath});`,
      );
    }

    const registered = createRegisteredSource(source);
    this.sources.set(registered.id, registered);
    return registered;
  }

  async renameSource(sourceId: string, newTableName: string): Promise<RegisteredSource> {
    await this.ensureReady();
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);
    await this.connection!.query(
      `ALTER VIEW ${quoteIdentifier(source.tableName)} RENAME TO ${quoteIdentifier(newTableName)}`,
    );
    const updated = { ...source, tableName: newTableName };
    this.sources.set(sourceId, updated);
    return updated;
  }

  async dropSource(sourceId: string): Promise<void> {
    await this.ensureReady();
    const source = this.sources.get(sourceId);
    if (!source) return;
    await this.connection!.query(`DROP VIEW IF EXISTS ${quoteIdentifier(source.tableName)}`);
    this.sources.delete(sourceId);
  }

  async execute(sql: string): Promise<QueryExecutionResult> {
    await this.ensureReady();
    const startedAt = performance.now();

    try {
      const arrowTable = await this.connection!.query(sql);
      const rows = arrowTable.toArray().map((row: unknown) => normalizeRow(row));
      const columns = getColumnNames(arrowTable, rows);
      return {
        sql,
        columns,
        rows: rows.slice(0, DISPLAY_ROW_LIMIT),
        rowCount: rows.length,
        executionMs: Math.round(performance.now() - startedAt),
        truncated: rows.length > DISPLAY_ROW_LIMIT,
      };
    } catch (error) {
      const executionError = toSqlExecutionError(error, sql);
      return {
        sql,
        columns: [],
        rows: [],
        rowCount: 0,
        executionMs: Math.round(performance.now() - startedAt),
        error: executionError,
      };
    }
  }

  async getSchema(): Promise<SandboxSchema> {
    await this.ensureReady();
    const rows = await this.queryRows(
      "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name;",
    );

    const tables: SandboxTable[] = [];
    const views: SandboxTable[] = [];

    for (const row of rows) {
      const name = String(row.table_name ?? "");
      const tableType = String(row.table_type ?? "").toUpperCase();
      const columns = await this.queryRows(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'main' AND table_name = '${name.replace(/'/g, "''")}' ORDER BY ordinal_position;`,
      );
      const schemaTable: SandboxTable = {
        name,
        type: tableType.includes("VIEW") ? "view" : "table",
        columns: normalizeSchemaColumns(columns),
      };
      if (schemaTable.type === "view") {
        views.push(schemaTable);
      } else {
        tables.push(schemaTable);
      }
    }

    return {
      sources: Array.from(this.sources.values()),
      tables,
      views,
    };
  }

  async exportResult(result: QueryExecutionResult, format: ExportFormat): Promise<Blob> {
    return createExportBlob(result, format);
  }

  async reset(): Promise<void> {
    await this.dispose();
    this.sources.clear();
    await this.init();
  }

  async dispose(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.db || !this.connection) {
      await this.init();
    }
  }

  private async queryRows(sql: string): Promise<Record<string, unknown>[]> {
    const result = await this.connection!.query(sql);
    return result.toArray().map((row: unknown) => normalizeRow(row));
  }
}

function normalizeRow(row: unknown): Record<string, unknown> {
  if (row && typeof row === "object" && "toJSON" in row) {
    return (row as { toJSON: () => Record<string, unknown> }).toJSON();
  }
  return { ...(row as Record<string, unknown>) };
}

function getColumnNames(
  table: { schema?: { fields?: Array<{ name: string }> } },
  rows: Record<string, unknown>[],
): string[] {
  const schemaColumns = table.schema?.fields?.map((field) => field.name) ?? [];
  if (schemaColumns.length > 0) {
    return schemaColumns;
  }
  return rows[0] ? Object.keys(rows[0]) : [];
}

function toSqlExecutionError(error: unknown, sql: string): SqlExecutionError {
  const message = error instanceof Error ? error.message : String(error);
  const lineMatch = message.match(/line\s+(\d+)/i);
  const columnMatch = message.match(/column\s+(\d+)/i);
  return {
    message,
    sql,
    line: lineMatch ? Number(lineMatch[1]) : undefined,
    column: columnMatch ? Number(columnMatch[1]) : undefined,
  };
}
