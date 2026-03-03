import { TomlParseResult, TomlTable, TomlValue } from "../types";

type TomlRuntime = {
  parse: (input: string) => unknown;
};

const tryRequire = (moduleName: string): unknown => {
  try {
    const runtimeRequire = eval("require") as (name: string) => unknown;
    return runtimeRequire(moduleName);
  } catch {
    return null;
  }
};

const getTomlRuntime = (): TomlRuntime | null => {
  try {
    const runtime = tryRequire("@iarna/toml") as TomlRuntime;
    if (runtime && typeof runtime.parse === "function") {
      return runtime;
    }
    return null;
  } catch {
    return null;
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
};

const findTopLevelIndex = (value: string, token: string): number => {
  let inSingle = false;
  let inDouble = false;
  let escapeNext = false;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\" && inDouble) {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

    if (char === token && bracketDepth === 0 && braceDepth === 0) {
      return i;
    }
  }

  return -1;
};

const stripComment = (line: string): string => {
  let inSingle = false;
  let inDouble = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\" && inDouble) {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (char === "#" && !inSingle && !inDouble) {
      return line.slice(0, i).trimEnd();
    }
  }

  return line;
};

const splitTopLevel = (value: string, delimiter: string): string[] => {
  const parts: string[] = [];
  let inSingle = false;
  let inDouble = false;
  let escapeNext = false;
  let bracketDepth = 0;
  let braceDepth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\" && inDouble) {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

    if (char === delimiter && bracketDepth === 0 && braceDepth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  const finalPart = value.slice(start).trim();
  if (finalPart) {
    parts.push(finalPart);
  }

  return parts;
};

const parseKeyPath = (rawKeyPath: string): string[] => {
  return splitTopLevel(rawKeyPath, ".").map((segment) => {
    const trimmed = segment.trim();

    if (!trimmed) {
      throw new Error("Empty key segment");
    }

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  });
};

const parseTomlValue = (valueText: string): TomlValue => {
  const trimmed = valueText.trim();

  if (!trimmed) {
    throw new Error("Missing value");
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^[+-]?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  if (/^[+-]?\d+\.\d+$/.test(trimmed)) {
    return Number.parseFloat(trimmed);
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
    /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})?$/.test(trimmed)
  ) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) {
      return [];
    }

    return splitTopLevel(inner, ",").map((part) => parseTomlValue(part));
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    const inlineTable: Record<string, TomlValue> = {};

    if (!inner) {
      return inlineTable;
    }

    splitTopLevel(inner, ",").forEach((pair) => {
      const eqIndex = findTopLevelIndex(pair, "=");
      if (eqIndex < 0) {
        throw new Error(`Invalid inline table entry: ${pair}`);
      }

      const rawKey = pair.slice(0, eqIndex).trim();
      const rawValue = pair.slice(eqIndex + 1).trim();
      const [key] = parseKeyPath(rawKey);
      inlineTable[key] = parseTomlValue(rawValue);
    });

    return inlineTable;
  }

  throw new Error(`Unsupported TOML value: ${trimmed}`);
};

const ensureTablePath = (root: TomlTable, keyPath: string[]): TomlTable => {
  let cursor: TomlTable = root;

  keyPath.forEach((segment) => {
    const existing = cursor[segment];

    if (existing === undefined) {
      cursor[segment] = {};
      cursor = cursor[segment] as TomlTable;
      return;
    }

    if (Array.isArray(existing)) {
      const lastItem = existing[existing.length - 1];
      if (isPlainObject(lastItem)) {
        cursor = lastItem as TomlTable;
        return;
      }
      throw new Error(`Path '${segment}' is not a table`);
    }

    if (isPlainObject(existing)) {
      cursor = existing as TomlTable;
      return;
    }

    throw new Error(`Path '${segment}' is not a table`);
  });

  return cursor;
};

const parseTomlFallback = (content: string): TomlTable => {
  const root: TomlTable = {};
  const lines = content.split(/\r?\n/);
  let currentTable: TomlTable = root;

  lines.forEach((originalLine, index) => {
    const trimmed = stripComment(originalLine).trim();

    if (!trimmed) {
      return;
    }

    if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
      const rawPath = trimmed.slice(2, -2).trim();
      const keyPath = parseKeyPath(rawPath);

      if (keyPath.length === 0) {
        throw new Error("Array table path is empty");
      }

      const parent = ensureTablePath(root, keyPath.slice(0, -1));
      const lastSegment = keyPath[keyPath.length - 1];
      const existing = parent[lastSegment];
      let tableArray: TomlTable[];

      if (existing === undefined) {
        tableArray = [];
        parent[lastSegment] = tableArray;
      } else if (Array.isArray(existing)) {
        tableArray = existing as TomlTable[];
      } else {
        throw new Error(`Path '${rawPath}' is not an array of tables`);
      }

      const nextTable: TomlTable = {};
      tableArray.push(nextTable);
      currentTable = nextTable;
      return;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const rawPath = trimmed.slice(1, -1).trim();
      const keyPath = parseKeyPath(rawPath);
      currentTable = ensureTablePath(root, keyPath);
      return;
    }

    const equalsIndex = findTopLevelIndex(trimmed, "=");
    if (equalsIndex < 0) {
      throw new Error("Expected key/value pair");
    }

    const rawKey = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const keyPath = parseKeyPath(rawKey);

    const parent = ensureTablePath(currentTable, keyPath.slice(0, -1));
    parent[keyPath[keyPath.length - 1]] = parseTomlValue(rawValue);
  });

  return root;
};

const toTomlTable = (value: unknown): TomlTable => {
  if (!isPlainObject(value)) {
    return {};
  }

  return value as TomlTable;
};

export const parseToml = (content: string): TomlParseResult => {
  if (!content.trim()) {
    return {
      data: {},
      error: null,
    };
  }

  const runtime = getTomlRuntime();

  try {
    const parsed = runtime ? runtime.parse(content) : parseTomlFallback(content);
    return {
      data: toTomlTable(parsed),
      error: null,
    };
  } catch (error) {
    return {
      data: {},
      error: error instanceof Error ? `Failed to parse TOML: ${error.message}` : "Failed to parse TOML",
    };
  }
};

export const __internal = {
  parseTomlFallback,
  parseTomlValue,
  parseKeyPath,
  splitTopLevel,
  stripComment,
};
