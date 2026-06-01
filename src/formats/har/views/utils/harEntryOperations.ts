import { HarEntry, HarFile } from "../types";

export interface HarParseResult {
  file: HarFile | null;
  error: string | null;
}

export interface HarEntryComparisonRow {
  path: string;
  leftValue: string;
  rightValue: string;
  isEqual: boolean;
}

export interface HarEntryComparison {
  same: HarEntryComparisonRow[];
  different: HarEntryComparisonRow[];
}

export function parseHarContent(content: string): HarParseResult {
  try {
    const parsed = JSON.parse(content) as HarFile;
    if (!parsed?.log || !Array.isArray(parsed.log.entries)) {
      return { file: null, error: "Invalid HAR: missing log.entries" };
    }
    return { file: parsed, error: null };
  } catch (e) {
    return { file: null, error: `JSON parse error: ${(e as Error).message}` };
  }
}

export function serializeHar(file: HarFile): string {
  return JSON.stringify(file, null, 2);
}

export function deleteHarEntries(file: HarFile, indexesToDelete: Set<number>): HarFile {
  if (indexesToDelete.size === 0) return file;

  return {
    ...file,
    log: {
      ...file.log,
      entries: file.log.entries.filter((_, index) => !indexesToDelete.has(index)),
    },
  };
}

export function mergeHarFiles(base: HarFile, incoming: HarFile): HarFile {
  const existingPageIds = new Set((base.log.pages ?? []).map((page) => page.id));
  const incomingUniquePages = (incoming.log.pages ?? []).filter((page) => {
    if (existingPageIds.has(page.id)) return false;
    existingPageIds.add(page.id);
    return true;
  });

  return {
    ...base,
    log: {
      ...base.log,
      pages: base.log.pages || incomingUniquePages.length > 0
        ? [...(base.log.pages ?? []), ...incomingUniquePages]
        : undefined,
      entries: [...base.log.entries, ...incoming.log.entries],
    },
  };
}

export function mergeHarContent(baseContent: string, incomingContent: string): HarParseResult {
  const base = parseHarContent(baseContent);
  if (!base.file) return base;

  const incoming = parseHarContent(incomingContent);
  if (!incoming.file) {
    return {
      file: null,
      error: incoming.error ? `Merge content: ${incoming.error}` : "Merge content is not a valid HAR file",
    };
  }

  return { file: mergeHarFiles(base.file, incoming.file), error: null };
}

export function compareHarEntries(left: HarEntry, right: HarEntry): HarEntryComparison {
  const leftFlat = flattenValue(left);
  const rightFlat = flattenValue(right);
  const paths = [...new Set([...Object.keys(leftFlat), ...Object.keys(rightFlat)])].sort();

  const same: HarEntryComparisonRow[] = [];
  const different: HarEntryComparisonRow[] = [];

  for (const path of paths) {
    const row: HarEntryComparisonRow = {
      path,
      leftValue: leftFlat[path] ?? "(missing)",
      rightValue: rightFlat[path] ?? "(missing)",
      isEqual: leftFlat[path] === rightFlat[path],
    };

    if (row.isEqual) same.push(row);
    else different.push(row);
  }

  return { same, different };
}

function flattenValue(value: unknown, path = ""): Record<string, string> {
  if (value === null || typeof value !== "object") {
    return { [path || "(root)"]: stringifyScalar(value) };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return { [path || "(root)"]: "[]" };

    return value.reduce<Record<string, string>>((acc, item, index) => {
      Object.assign(acc, flattenValue(item, `${path}[${index}]`));
      return acc;
    }, {});
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return { [path || "(root)"]: "{}" };

  return entries.reduce<Record<string, string>>((acc, [key, child]) => {
    const nextPath = path ? `${path}.${key}` : key;
    Object.assign(acc, flattenValue(child, nextPath));
    return acc;
  }, {});
}

function stringifyScalar(value: unknown): string {
  if (value === undefined) return "(missing)";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
