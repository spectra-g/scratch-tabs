export type TomlValueType =
  | "string"
  | "integer"
  | "float"
  | "boolean"
  | "offset-datetime"
  | "local-datetime"
  | "local-date"
  | "local-time"
  | "array"
  | "inline-table"
  | "table"
  | "array-of-tables";

export interface TomlNode {
  id: string;
  path: string;
  key: string;
  value: unknown;
  type: TomlValueType;
  children?: TomlNode[];
}

export interface TomlParseResult {
  root: TomlNode[];
  error: string | null;
}

export interface UseTomlDataReturn {
  nodes: TomlNode[];
  error: string | null;
}
