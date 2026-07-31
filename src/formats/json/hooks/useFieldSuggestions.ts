import { useMemo } from "react";
import { JsonNodeData, buildTree } from "../components/JsonTreeView/JsonTreeView";

const MAX_KEY_SUGGESTIONS = 6;
const MAX_PATH_SUGGESTIONS = 6;
// How much of a key's name must already be typed before we treat it as a
// confident match and start suggesting its children's paths.
const STRONG_MATCH_RATIO = 0.7;

export interface FieldIndexEntry {
  key: string;
  path: string;
  parentPath: string;
  isExpandable: boolean;
  hasChildren: boolean;
}

export interface FieldIndex {
  entries: FieldIndexEntry[];
  childrenByParentPath: Map<string, FieldIndexEntry[]>;
}

export interface FieldSuggestion {
  kind: "key" | "path";
  path: string;
  label: string;
  matchedKey?: string;
}

const EMPTY_INDEX: FieldIndex = {
  entries: [],
  childrenByParentPath: new Map(),
};

// Flattens the whole document into a lookup table once per parse, so
// per-keystroke suggestion filtering never has to re-walk the tree.
export function buildFieldIndex(rootNodeData: JsonNodeData | null): FieldIndex {
  if (!rootNodeData) return EMPTY_INDEX;

  const entries: FieldIndexEntry[] = [];
  const childrenByParentPath = new Map<string, FieldIndexEntry[]>();

  const walk = (nodeData: JsonNodeData, parentPath: string): void => {
    const isExpandable = nodeData.type === "object" || nodeData.type === "array";
    const hasChildren =
      isExpandable && !!nodeData.value && Object.keys(nodeData.value).length > 0;

    if (nodeData.path) {
      const entry: FieldIndexEntry = {
        key: String(nodeData.key),
        path: nodeData.path,
        parentPath,
        isExpandable,
        hasChildren,
      };
      entries.push(entry);
      const siblings = childrenByParentPath.get(parentPath);
      if (siblings) siblings.push(entry);
      else childrenByParentPath.set(parentPath, [entry]);
    }

    if (isExpandable && nodeData.value) {
      Object.entries(nodeData.value).forEach(([key, value]) => {
        const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
        const childPath = nodeData.path
          ? nodeData.type === "array"
            ? `${nodeData.path}[${childKey}]`
            : `${nodeData.path}.${childKey}`
          : nodeData.type === "array"
            ? `[${childKey}]`
            : String(childKey);
        walk(buildTree(childKey, value, nodeData.depth + 1, childPath), nodeData.path);
      });
    }
  };

  walk(rootNodeData, "");
  return { entries, childrenByParentPath };
}

const isStrongMatch = (entry: FieldIndexEntry, lower: string, totalMatches: number): boolean => {
  const key = entry.key.toLowerCase();
  if (totalMatches === 1) return true;
  if (key === lower) return true;
  return key.startsWith(lower) && lower.length / key.length >= STRONG_MATCH_RATIO;
};

// Resolves a sequence of already-typed segments (e.g. ["features"]) down
// through the index by exact (case-insensitive) key match at each level.
// Returns the resolved node's path ("" for the document root), or null if
// any segment doesn't exist.
const resolveSegmentPath = (fieldIndex: FieldIndex, segments: string[]): string | null => {
  let currentPath = "";
  for (const segment of segments) {
    const lowerSegment = segment.toLowerCase();
    const children = fieldIndex.childrenByParentPath.get(currentPath) ?? [];
    const match = children.find((entry) => entry.key.toLowerCase() === lowerSegment);
    if (!match) return null;
    currentPath = match.path;
  }
  return currentPath;
};

// Once the user has typed a real path prefix (e.g. "features." or
// "features.se"), suggest full paths to every descendant under that
// resolved node whose key matches whatever comes after the last separator.
const getScopedPathSuggestions = (
  fieldIndex: FieldIndex,
  prefixSegments: string[],
  remainder: string,
  maxPathSuggestions: number,
): FieldSuggestion[] => {
  const resolvedPath = resolveSegmentPath(fieldIndex, prefixSegments);
  if (resolvedPath === null) return [];

  const lowerRemainder = remainder.toLowerCase();
  const descendants = fieldIndex.entries.filter((entry) => {
    const isDescendant =
      entry.path.startsWith(`${resolvedPath}.`) || entry.path.startsWith(`${resolvedPath}[`);
    if (!isDescendant) return false;
    return !lowerRemainder || entry.key.toLowerCase().includes(lowerRemainder);
  });

  const rank = (entry: FieldIndexEntry): number => {
    if (!lowerRemainder) return 0;
    const key = entry.key.toLowerCase();
    if (key === lowerRemainder) return 0;
    if (key.startsWith(lowerRemainder)) return 1;
    return 2;
  };

  const sorted = [...descendants].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.path.length !== b.path.length) return a.path.length - b.path.length;
    return a.key.localeCompare(b.key);
  });

  const seenPaths = new Set<string>();
  const suggestions: FieldSuggestion[] = [];
  for (const entry of sorted) {
    if (suggestions.length >= maxPathSuggestions) break;
    if (seenPaths.has(entry.path)) continue;
    seenPaths.add(entry.path);
    suggestions.push({ kind: "path", path: entry.path, label: entry.path });
  }
  return suggestions;
};

// Produces two kinds of suggestions from a single typed term:
//   "key"  - other field names containing the term, so the box can be
//            autocompleted the way the rest of the tree search already works.
//   "path" - once the term confidently identifies one field, the full paths
//            to that field's children, so the user can jump straight there.
//
// If the term already contains a typed path prefix (e.g. "features." or
// "features.se"), the prefix is resolved against the index and only its
// descendants are searched/suggested - a bare substring match would never
// find anything, since no key literally contains a "." or "[".
export function getFieldSuggestions(
  fieldIndex: FieldIndex,
  inputValue: string,
  maxKeySuggestions = MAX_KEY_SUGGESTIONS,
  maxPathSuggestions = MAX_PATH_SUGGESTIONS,
): FieldSuggestion[] {
  const term = inputValue.trim();
  if (!term) return [];

  const endsWithSeparator = /[.[]$/.test(term);
  const tokens = term.match(/[^.[\]]+/g) || [];
  if (tokens.length === 0) return [];

  const hasTypedPrefix = endsWithSeparator ? true : tokens.length > 1;
  if (hasTypedPrefix) {
    const prefixSegments = endsWithSeparator ? tokens : tokens.slice(0, -1);
    const remainder = endsWithSeparator ? "" : tokens[tokens.length - 1];
    return getScopedPathSuggestions(fieldIndex, prefixSegments, remainder, maxPathSuggestions);
  }

  const lower = term.toLowerCase();

  const matches = fieldIndex.entries.filter((entry) => entry.key.toLowerCase().includes(lower));
  if (matches.length === 0) return [];

  const rank = (entry: FieldIndexEntry): number => {
    const key = entry.key.toLowerCase();
    if (key === lower) return 0;
    if (key.startsWith(lower)) return 1;
    return 2;
  };

  const sorted = [...matches].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.path.length !== b.path.length) return a.path.length - b.path.length;
    return a.key.localeCompare(b.key);
  });

  const keySuggestions: FieldSuggestion[] = [];
  const seenKeyPaths = new Set<string>();
  for (const entry of sorted) {
    if (keySuggestions.length >= maxKeySuggestions) break;
    if (seenKeyPaths.has(entry.path)) continue;
    seenKeyPaths.add(entry.path);
    keySuggestions.push({
      kind: "key",
      path: entry.path,
      label: entry.path || entry.key,
      matchedKey: entry.key,
    });
  }

  const pathSuggestions: FieldSuggestion[] = [];
  const seenChildPaths = new Set<string>();
  for (const entry of sorted) {
    if (pathSuggestions.length >= maxPathSuggestions) break;
    if (!entry.isExpandable || !entry.hasChildren) continue;
    if (!isStrongMatch(entry, lower, matches.length)) continue;

    const children = fieldIndex.childrenByParentPath.get(entry.path) ?? [];
    for (const child of children) {
      if (pathSuggestions.length >= maxPathSuggestions) break;
      if (seenChildPaths.has(child.path)) continue;
      seenChildPaths.add(child.path);
      pathSuggestions.push({
        kind: "path",
        path: child.path,
        label: child.path,
      });
    }
  }

  return [...keySuggestions, ...pathSuggestions];
}

export function useFieldSuggestions(
  rootNodeData: JsonNodeData | null,
  inputValue: string,
): FieldSuggestion[] {
  const fieldIndex = useMemo(() => buildFieldIndex(rootNodeData), [rootNodeData]);
  return useMemo(() => getFieldSuggestions(fieldIndex, inputValue), [fieldIndex, inputValue]);
}
