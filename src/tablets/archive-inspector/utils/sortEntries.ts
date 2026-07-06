import { ArchiveEntry, SortBy, SortDir, SearchScope } from "../types";
import { getExtension } from "./mimeFromExtension";

export function sortEntries(
  entries: ArchiveEntry[],
  sortBy: SortBy,
  sortDir: SortDir,
): ArchiveEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    let cmp = 0;
    switch (sortBy) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "size":
        cmp = a.sizeUncompressed - b.sizeUncompressed;
        break;
      case "compressedSize":
        cmp = a.sizeCompressed - b.sizeCompressed;
        break;
      case "modified":
        cmp = (a.modified ?? 0) - (b.modified ?? 0);
        break;
    }

    return sortDir === "asc" ? cmp : -cmp;
  });

  return sorted;
}

export function filterEntries(
  entries: ArchiveEntry[],
  searchQuery: string,
  searchScope: SearchScope,
  showDotFiles: boolean,
  filterExtensions: string[],
): ArchiveEntry[] {
  let filtered = entries;

  if (!showDotFiles) {
    filtered = filtered.filter((e) => !e.name.startsWith("."));
  }

  if (filterExtensions.length > 0) {
    filtered = filtered.filter(
      (e) => e.isDirectory || filterExtensions.includes(getExtension(e.name)),
    );
  }

  if (searchQuery && searchScope !== "content") {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((e) => {
      if (e.isDirectory) return true;
      if (searchScope === "name") return e.name.toLowerCase().includes(q);
      if (searchScope === "path") return e.path.toLowerCase().includes(q);
      return true;
    });
  }

  return filtered;
}

export function computeVisibleEntries(
  entries: ArchiveEntry[],
  expandedPaths: Set<string>,
  searchQuery: string,
  searchScope: SearchScope,
  showDotFiles: boolean,
  filterExtensions: string[],
  viewMode: "tree" | "flat",
  sortBy: SortBy,
  sortDir: SortDir,
): ArchiveEntry[] {
  let filtered = filterEntries(entries, searchQuery, searchScope, showDotFiles, filterExtensions);
  filtered = sortEntries(filtered, sortBy, sortDir);

  if (viewMode === "flat") {
    return filtered.filter((e) => !e.isDirectory);
  }

  // Tree view: only show entries whose parent folder is expanded (or at root)
  return filtered.filter((e) => {
    const parentPath = getParentPath(e.path);
    return parentPath === null || expandedPaths.has(parentPath);
  });
}

export function getParentPath(entryPath: string): string | null {
  const normalized = entryPath.endsWith("/") ? entryPath.slice(0, -1) : entryPath;
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) return null;
  return normalized.slice(0, lastSlash) + "/";
}

export function getAllParentPaths(entryPath: string): string[] {
  const parents: string[] = [];
  let current = getParentPath(entryPath);
  while (current !== null) {
    parents.push(current);
    current = getParentPath(current);
  }
  return parents;
}
