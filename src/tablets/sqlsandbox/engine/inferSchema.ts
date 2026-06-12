import { SandboxColumn } from "../sqlSandboxTypes";

export function toFriendlyType(engineType: string): string {
  const normalized = engineType.toUpperCase();

  if (/TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UBIGINT|UINTEGER/.test(normalized)) {
    return "integer";
  }
  if (/DECIMAL|DOUBLE|FLOAT|REAL/.test(normalized)) {
    return "decimal";
  }
  if (/BOOL/.test(normalized)) {
    return "boolean";
  }
  if (/TIMESTAMP|DATETIME/.test(normalized)) {
    return "timestamp";
  }
  if (/\bDATE\b/.test(normalized)) {
    return "date";
  }
  if (/JSON|STRUCT|LIST|MAP|UNION/.test(normalized)) {
    return "nested";
  }
  if (/BLOB|BYTEA|BINARY/.test(normalized)) {
    return "binary";
  }
  return "text";
}

export function normalizeSchemaColumns(
  columns: Array<{
    column_name?: string;
    name?: string;
    data_type?: string;
    type?: string;
    is_nullable?: string | boolean;
  }>,
): SandboxColumn[] {
  return columns.map((column) => {
    const name = column.column_name ?? column.name ?? "";
    const engineType = column.data_type ?? column.type ?? "UNKNOWN";
    return {
      name,
      engineType,
      friendlyType: toFriendlyType(engineType),
      nullable:
        typeof column.is_nullable === "boolean"
          ? column.is_nullable
          : column.is_nullable
            ? column.is_nullable.toUpperCase() === "YES"
            : undefined,
    };
  });
}
