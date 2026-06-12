import {
  RegisteredSource,
  SqlSandboxSource,
  SqlSandboxSourceKind,
} from "../sqlSandboxTypes";

const EXTENSION_TO_KIND: Record<string, SqlSandboxSourceKind> = {
  csv: "csv",
  tsv: "tsv",
  json: "json",
  ndjson: "ndjson",
  jsonl: "ndjson",
  parquet: "parquet",
  pq: "parquet",
};

export const PERSISTED_SOURCE_SIZE_LIMIT_BYTES = 1024 * 1024;

const TEXT_PERSISTABLE_KINDS = new Set<SqlSandboxSourceKind>([
  "csv",
  "tsv",
  "json",
  "ndjson",
]);

export function detectSourceKind(fileName: string): SqlSandboxSourceKind | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_KIND[extension] ?? null;
}

export function sanitizeIdentifier(input: string): string {
  const withoutExtension = input.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  const safe = normalized || "data";
  return /^[a-zA-Z_]/.test(safe) ? safe : `data_${safe}`;
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function createSourceFromFile(
  file: File,
  existingTableNames: string[] = [],
): SqlSandboxSource {
  const kind = detectSourceKind(file.name);
  if (!kind) {
    throw new Error(`Unsupported source type for ${file.name}`);
  }

  return {
    id: createSourceId(file.name),
    name: file.name,
    tableName: createUniqueTableName(sanitizeIdentifier(file.name), existingTableNames),
    kind,
    size: file.size,
    file,
  };
}

export function createRegisteredSource(source: SqlSandboxSource): RegisteredSource {
  return {
    id: source.id,
    name: source.name,
    tableName: source.tableName,
    kind: source.kind,
    size: source.size,
    persistedContent: source.text
      ? {
          encoding: "text",
          content: source.text,
          size: source.size,
        }
      : undefined,
    restoreStatus:
      source.text
        ? "available"
        : canPersistSourceKind(source.kind)
          ? source.size > PERSISTED_SOURCE_SIZE_LIMIT_BYTES
            ? "too-large"
            : undefined
          : "unsupported",
  };
}

export function canPersistSourceKind(kind: SqlSandboxSourceKind): boolean {
  return TEXT_PERSISTABLE_KINDS.has(kind);
}

export async function attachPersistedContent(
  source: RegisteredSource,
  file: File,
): Promise<RegisteredSource> {
  if (!canPersistSourceKind(source.kind)) {
    return { ...source, restoreStatus: "unsupported" };
  }

  if (file.size > PERSISTED_SOURCE_SIZE_LIMIT_BYTES) {
    return { ...source, restoreStatus: "too-large" };
  }

  return {
    ...source,
    persistedContent: {
      encoding: "text",
      content: await readFileText(file),
      size: file.size,
    },
    restoreStatus: "available",
  };
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function createUniqueTableName(baseName: string, existing: string[]): string {
  const taken = new Set(existing.map((name) => name.toLowerCase()));
  if (!taken.has(baseName.toLowerCase())) {
    return baseName;
  }

  let index = 2;
  while (taken.has(`${baseName}_${index}`.toLowerCase())) {
    index += 1;
  }
  return `${baseName}_${index}`;
}

function createSourceId(name: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${sanitizeIdentifier(name)}-${random}`;
}
