export type EnvValueType = "url" | "boolean" | "number" | "json" | "secret" | "string";

// ─── Legacy flat-entry types (kept for backward compat with tests) ───────────

export interface EnvEntry {
  key: string;
  rawValue: string;
  /** Value with surrounding quotes stripped. */
  value: string;
  comment: string | null;
  /** Inferred type for display hints. */
  type: EnvValueType;
  hasExport: boolean;
  /** True when the key name suggests a sensitive value. */
  isSecret: boolean;
  lineNumber: number;
}

export interface DotenvParseResult {
  entries: EnvEntry[];
  comments: string[];
  blankLineGroups: number[];
}

// ─── Stateful editing model (mirrors properties format) ─────────────────────

export interface DotenvPair {
  type: "PAIR";
  id: string;
  key: string;
  /** Raw value as-written (may include quotes). */
  rawValue: string;
  /** Unquoted display value. */
  value: string;
  hasExport: boolean;
  valueType: EnvValueType;
  isSecret: boolean;
}

export interface DotenvComment {
  type: "COMMENT";
  id: string;
  /** Full comment line including the leading `#`. */
  text: string;
}

export interface DotenvBlank {
  type: "BLANK";
  id: string;
}

export type DotenvStateLine = DotenvPair | DotenvComment | DotenvBlank;
export type DotenvState = DotenvStateLine[];

export interface DotenvValidation {
  duplicateKeys: string[];
  emptyValues: string[];
}

// ─── Shared regexes ──────────────────────────────────────────────────────────

const SECRET_KEY_PATTERN =
  /(?:key|secret|token|password|passwd|pwd|pass|credential|auth|api_?key|private|jwt|bearer|access_?token|refresh_?token)/i;
const EXPORT_PREFIX = /^export\s+/;
const INLINE_COMMENT = /\s+#\s.+$/;
const URL_VALUE = /^https?:\/\//i;
const BOOLEAN_VALUE = /^(?:true|false|yes|no|on|off)$/i;
const NUMBER_VALUE = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

// ─── Shared helpers ──────────────────────────────────────────────────────────

export function stripQuotes(raw: string): string {
  const s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

export function inferType(key: string, value: string): EnvValueType {
  if (!value) return "string";
  if (URL_VALUE.test(value)) return "url";
  if (BOOLEAN_VALUE.test(value)) return "boolean";
  if (NUMBER_VALUE.test(value)) return "number";
  try {
    if (value.startsWith("{") || value.startsWith("[")) {
      JSON.parse(value);
      return "json";
    }
  } catch {
    // not JSON
  }
  if (SECRET_KEY_PATTERN.test(key)) return "secret";
  return "string";
}

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

// ─── Stateful model parse / serialize ────────────────────────────────────────

let _idCounter = 0;
function uid(): string {
  return `env_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function parseToState(content: string): DotenvState {
  const lines = content.split("\n");
  const state: DotenvState = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      state.push({ type: "BLANK", id: uid() });
      continue;
    }

    if (trimmed.startsWith("#")) {
      state.push({ type: "COMMENT", id: uid(), text: trimmed });
      continue;
    }

    const hasExport = EXPORT_PREFIX.test(trimmed);
    const withoutExport = hasExport ? trimmed.replace(EXPORT_PREFIX, "") : trimmed;

    const eqIdx = withoutExport.indexOf("=");
    if (eqIdx === -1) {
      // Treat unparseable lines as comments to preserve them
      state.push({ type: "COMMENT", id: uid(), text: line });
      continue;
    }

    const key = withoutExport.slice(0, eqIdx).trim();
    let rawValue = withoutExport.slice(eqIdx + 1);

    if (!rawValue.trim().startsWith('"') && !rawValue.trim().startsWith("'")) {
      const m = INLINE_COMMENT.exec(rawValue);
      if (m) rawValue = rawValue.slice(0, m.index);
    }

    rawValue = rawValue.trim();
    const value = stripQuotes(rawValue);
    const isSecret = isSecretKey(key);
    const valueType = inferType(key, value);

    state.push({
      type: "PAIR",
      id: uid(),
      key,
      rawValue,
      value,
      hasExport,
      valueType,
      isSecret,
    });
  }

  return state;
}

export function serializeState(state: DotenvState): string {
  return state
    .map((line) => {
      if (line.type === "BLANK") return "";
      if (line.type === "COMMENT") return line.text;
      const prefix = line.hasExport ? "export " : "";
      return `${prefix}${line.key}=${line.rawValue}`;
    })
    .join("\n");
}

// ─── Stateful operations ─────────────────────────────────────────────────────

/** Sort keys alphabetically within each comment-delimited section. */
export function sortAlphabetically(state: DotenvState): DotenvState {
  type Section = DotenvStateLine[];
  const sections: Section[] = [];
  let current: Section = [];
  let consecutiveBlanks = 0;

  for (let i = 0; i < state.length; i++) {
    const line = state[i];

    if (line.type === "BLANK") {
      consecutiveBlanks++;
      if (consecutiveBlanks === 1) {
        const nextNonBlank = state.slice(i + 1).find((l) => l.type !== "BLANK");
        if (nextNonBlank?.type === "COMMENT" && current.length > 0) {
          sections.push(current);
          current = [line];
        } else {
          current.push(line);
        }
      }
      continue;
    }

    consecutiveBlanks = 0;

    if (line.type === "COMMENT") {
      if (current.some((l) => l.type === "PAIR")) {
        sections.push(current);
        current = [];
      }
      current.push(line);
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current);

  const sorted = sections.map((section) => {
    const blanks = section.filter((l) => l.type === "BLANK");
    const comments = section.filter((l) => l.type === "COMMENT");
    const pairs = section.filter((l) => l.type === "PAIR") as DotenvPair[];
    pairs.sort((a, b) => a.key.localeCompare(b.key));
    return [...blanks.slice(0, 1), ...comments, ...pairs];
  });

  return dedupeBlankLines(sorted.flat());
}

/** Group keys by their prefix (the part before the first `_`). */
export function groupByPrefix(state: DotenvState): DotenvState {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  const groups = new Map<string, DotenvPair[]>();

  for (const pair of pairs) {
    const prefix = pair.key.split("_")[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(pair);
  }

  const sorted = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // Collect global header comments (before the first PAIR)
  const newState: DotenvState = [];
  for (const line of state) {
    if (line.type === "PAIR") break;
    if (line.type === "COMMENT" || line.type === "BLANK") newState.push(line);
  }

  sorted.forEach(([prefix, groupPairs], idx) => {
    if (idx > 0 || newState.length > 0) {
      newState.push({ type: "BLANK", id: uid() });
    }
    newState.push({ type: "COMMENT", id: uid(), text: `# ${prefix} configuration` });
    const sortedPairs = [...groupPairs].sort((a, b) => a.key.localeCompare(b.key));
    newState.push(...sortedPairs);
  });

  return newState;
}

/** Keep only the last occurrence of each key. */
export function removeDuplicates(state: DotenvState): DotenvState {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  const keyCount = new Map<string, number>();
  for (const p of pairs) keyCount.set(p.key, (keyCount.get(p.key) ?? 0) + 1);

  const seenKeys = new Map<string, number>();
  return state.filter((line) => {
    if (line.type !== "PAIR") return true;
    const count = keyCount.get(line.key) ?? 1;
    if (count <= 1) return true;
    seenKeys.set(line.key, (seenKeys.get(line.key) ?? 0) + 1);
    // Keep only the last occurrence
    return seenKeys.get(line.key) === count;
  });
}

/** Remove all COMMENT lines and inline comments. */
export function stripComments(state: DotenvState): DotenvState {
  return dedupeBlankLines(state.filter((l) => l.type !== "COMMENT"));
}

/** Reduce consecutive blank lines to at most one. */
export function removeExtraBlankLines(state: DotenvState): DotenvState {
  return dedupeBlankLines(state);
}

/** Remove all blank lines. */
export function removeAllBlankLines(state: DotenvState): DotenvState {
  return state.filter((l) => l.type !== "BLANK");
}

/** Validate and return a report of issues. */
export function validateState(state: DotenvState): DotenvValidation {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  const counts = new Map<string, number>();
  for (const p of pairs) counts.set(p.key, (counts.get(p.key) ?? 0) + 1);
  return {
    duplicateKeys: Array.from(counts.entries())
      .filter(([, n]) => n > 1)
      .map(([k]) => k),
    emptyValues: pairs.filter((p) => !p.value).map((p) => p.key),
  };
}

// ─── Converters ──────────────────────────────────────────────────────────────

export function toJson(state: DotenvState): string {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  const obj: Record<string, string> = {};
  for (const p of pairs) obj[p.key] = p.value;
  return JSON.stringify(obj, null, 2);
}

export function toShellExport(state: DotenvState): string {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  return pairs.map((p) => `export ${p.key}="${p.value.replace(/"/g, '\\"')}"`).join("\n");
}

export function toDockerFlags(state: DotenvState): string {
  const pairs = state.filter((l) => l.type === "PAIR") as DotenvPair[];
  return pairs.map((p) => `-e ${p.key}="${p.value.replace(/"/g, '\\"')}"`).join(" \\\n  ");
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function dedupeBlankLines(state: DotenvState): DotenvState {
  const out: DotenvState = [];
  let lastWasBlank = false;
  for (const line of state) {
    if (line.type === "BLANK") {
      if (!lastWasBlank) out.push(line);
      lastWasBlank = true;
    } else {
      out.push(line);
      lastWasBlank = false;
    }
  }
  return out;
}

// ─── Legacy parseDotenv (kept for backward compatibility with tests) ──────────

export function parseDotenv(content: string): DotenvParseResult {
  const entries: EnvEntry[] = [];
  const comments: string[] = [];
  const blankLineGroups: number[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      blankLineGroups.push(i + 1);
      continue;
    }

    if (trimmed.startsWith("#")) {
      comments.push(trimmed.slice(1).trim());
      continue;
    }

    const hasExport = EXPORT_PREFIX.test(trimmed);
    const withoutExport = hasExport ? trimmed.replace(EXPORT_PREFIX, "") : trimmed;

    const eqIdx = withoutExport.indexOf("=");
    if (eqIdx === -1) continue;

    const key = withoutExport.slice(0, eqIdx).trim();
    let rawValue = withoutExport.slice(eqIdx + 1);

    let inlineComment: string | null = null;
    if (!rawValue.trim().startsWith('"') && !rawValue.trim().startsWith("'")) {
      const commentMatch = INLINE_COMMENT.exec(rawValue);
      if (commentMatch) {
        inlineComment = commentMatch[0].replace(/^\s+#\s/, "");
        rawValue = rawValue.slice(0, commentMatch.index);
      }
    }

    const value = stripQuotes(rawValue);
    const isSecret = isSecretKey(key);
    const type = inferType(key, value);

    entries.push({
      key,
      rawValue: rawValue.trim(),
      value,
      comment: inlineComment,
      type,
      hasExport,
      isSecret,
      lineNumber: i + 1,
    });
  }

  return { entries, comments, blankLineGroups };
}

export function getValueStats(entries: EnvEntry[]): {
  total: number;
  secrets: number;
  urls: number;
  booleans: number;
  empty: number;
} {
  return {
    total: entries.length,
    secrets: entries.filter((e) => e.isSecret || e.type === "secret").length,
    urls: entries.filter((e) => e.type === "url").length,
    booleans: entries.filter((e) => e.type === "boolean").length,
    empty: entries.filter((e) => !e.value).length,
  };
}
