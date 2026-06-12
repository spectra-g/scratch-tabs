import { ExportFormat, QueryExecutionResult } from "../sqlSandboxTypes";

export function serializeResult(result: QueryExecutionResult, format: ExportFormat): string {
  if (format === "json") {
    return stringifyJsonSafe(result.rows, 2);
  }

  return toCsv(result.columns, result.rows);
}

export function stringifyJsonSafe(value: unknown, space?: number): string {
  return JSON.stringify(value, bigintReplacer, space);
}

export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function createExportBlob(result: QueryExecutionResult, format: ExportFormat): Blob {
  const type = format === "json" ? "application/json" : "text/csv";
  return new Blob([serializeResult(result, format)], { type: `${type};charset=utf-8` });
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(","));
  return [header, ...body].join("\n");
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let raw: string;
  if (value instanceof Date) {
    raw = value.toISOString();
  } else if (typeof value === "object") {
    raw = stringifyJsonSafe(value);
  } else {
    raw = String(value);
  }

  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
