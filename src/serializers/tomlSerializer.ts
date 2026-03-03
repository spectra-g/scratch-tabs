import { TomlTable, TomlValue } from "../types";

type TomlRuntime = {
  stringify: (input: unknown) => string;
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
    if (runtime && typeof runtime.stringify === "function") {
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

const shouldQuoteKey = (key: string): boolean => {
  return !/^[A-Za-z0-9_-]+$/.test(key);
};

const serializeKey = (key: string): string => {
  if (!shouldQuoteKey(key)) {
    return key;
  }

  return `"${key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
};

const serializeValue = (value: TomlValue | TomlTable | TomlTable[]): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return `"${value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(", ")}]`;
  }

  if (isPlainObject(value)) {
    const pairs = Object.entries(value).map(([key, objectValue]) => {
      return `${serializeKey(key)} = ${serializeValue(objectValue as TomlValue)}`;
    });
    return `{ ${pairs.join(", ")} }`;
  }

  return "\"\"";
};

const serializeTomlFallback = (data: TomlTable): string => {
  return Object.entries(data)
    .map(([key, value]) => `${serializeKey(key)} = ${serializeValue(value)}`)
    .join("\n");
};

export const serializeToml = (data: TomlTable): string => {
  if (Object.keys(data).length === 0) {
    return "";
  }

  const runtime = getTomlRuntime();

  try {
    if (runtime) {
      return runtime.stringify(data);
    }

    return serializeTomlFallback(data);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to serialize TOML: ${error.message}`
        : "Failed to serialize TOML",
    );
  }
};

export const __internal = {
  serializeTomlFallback,
  serializeValue,
  serializeKey,
};
