import { useMemo } from "react";
import { parse, TomlDate } from "smol-toml";
import { TomlNode, TomlValueType, UseTomlDataReturn } from "../types";

export function useTomlData(content: string): UseTomlDataReturn {
  return useMemo(() => {
    if (!content.trim()) return { nodes: [], error: null };
    try {
      const parsed = parse(content);
      const nodes = buildTomlTree(parsed as Record<string, unknown>, "");
      return { nodes, error: null };
    } catch (e) {
      return { nodes: [], error: e instanceof Error ? e.message : "Parse error" };
    }
  }, [content]);
}

function detectTomlType(value: unknown): TomlValueType {
  if (value instanceof TomlDate) {
    if (!value.isLocal()) return "offset-datetime";
    if (value.isTime()) return "local-time";
    if (value.isDate()) return "local-date";
    return "local-datetime";
  }
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "bigint") return "integer";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "float";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) {
    return value.length > 0 && typeof value[0] === "object" && value[0] !== null && !(value[0] instanceof TomlDate)
      ? "array-of-tables"
      : "array";
  }
  if (typeof value === "object" && value !== null) return "table";
  return "string";
}

function buildTomlTree(obj: Record<string, unknown>, basePath: string): TomlNode[] {
  return Object.entries(obj).map(([key, value]) => {
    const path = basePath ? `${basePath}.${key}` : key;
    const type = detectTomlType(value);
    const id = `${path}-${key}`;

    if (type === "table" || type === "inline-table") {
      return {
        id,
        path,
        key,
        value,
        type,
        children: buildTomlTree(value as Record<string, unknown>, path),
      };
    }

    if (type === "array-of-tables") {
      const items = value as Record<string, unknown>[];
      return {
        id,
        path,
        key,
        value,
        type,
        children: items.map((item, index) => ({
          id: `${path}[${index}]`,
          path: `${path}[${index}]`,
          key: `[${index}]`,
          value: item,
          type: "table" as TomlValueType,
          children: buildTomlTree(item, `${path}[${index}]`),
        })),
      };
    }

    if (type === "array") {
      const items = value as unknown[];
      return {
        id,
        path,
        key,
        value,
        type,
        children: items.map((item, index) => ({
          id: `${path}[${index}]`,
          path: `${path}[${index}]`,
          key: `[${index}]`,
          value: item,
          type: detectTomlType(item),
        })),
      };
    }

    return { id, path, key, value, type };
  });
}
