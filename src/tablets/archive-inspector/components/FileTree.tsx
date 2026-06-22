import React, { useCallback, useMemo, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import { ArchiveEntry, SearchScope, SortBy, SortDir, ViewMode } from "../types";
import { computeVisibleEntries } from "../utils/sortEntries";
import { FileTreeRow } from "./FileTreeRow";
import { EntryContextMenu } from "./EntryContextMenu";

const ROW_HEIGHT = 28;

interface ContextMenuState {
  entry: ArchiveEntry;
  position: { x: number; y: number };
  copiedId: string | null;
}

interface FileTreeProps {
  entries: ArchiveEntry[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  searchQuery: string;
  searchScope: SearchScope;
  sortBy: SortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
  showDotFiles: boolean;
  filterExtensions: string[];
  height: number;
  onSelectEntry: (path: string) => void;
  onToggleExpand: (path: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenInNewTab: (entry: ArchiveEntry) => void;
  onExtractFile: (entry: ArchiveEntry) => void;
  onExtractSubtree: (entry: ArchiveEntry) => void;
  onInspectNested: (entry: ArchiveEntry) => void;
  onCopyContent: (entry: ArchiveEntry) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  entries,
  expandedPaths,
  selectedPath,
  searchQuery,
  searchScope,
  sortBy,
  sortDir,
  viewMode,
  showDotFiles,
  filterExtensions,
  height,
  onSelectEntry,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onOpenInNewTab,
  onExtractFile,
  onExtractSubtree,
  onInspectNested,
  onCopyContent,
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const listRef = useRef<FixedSizeList>(null);

  const visibleEntries = useMemo(
    () =>
      computeVisibleEntries(
        entries,
        expandedPaths,
        searchQuery,
        searchScope,
        showDotFiles,
        filterExtensions,
        viewMode,
        sortBy,
        sortDir,
      ),
    [entries, expandedPaths, searchQuery, searchScope, showDotFiles, filterExtensions, viewMode, sortBy, sortDir],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: ArchiveEntry) => {
    e.preventDefault();
    setContextMenu({ entry, position: { x: e.clientX, y: e.clientY }, copiedId: null });
  }, []);

  const handleCopyPath = useCallback(async (entry: ArchiveEntry) => {
    await navigator.clipboard.writeText(entry.path);
    setContextMenu((m) => m ? { ...m, copiedId: "path" } : null);
    setTimeout(() => setContextMenu((m) => m ? { ...m, copiedId: null } : null), 2000);
  }, []);

  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const entry = visibleEntries[index];
      return (
        <FileTreeRow
          key={entry.path}
          entry={entry}
          isExpanded={expandedPaths.has(entry.path) || expandedPaths.has(entry.path.replace(/\/$/, "") + "/")}
          isSelected={selectedPath === entry.path}
          searchQuery={searchQuery}
          style={style}
          onClick={() => onSelectEntry(entry.path)}
          onContextMenu={(e) => handleContextMenu(e, entry)}
          onExpandToggle={() => onToggleExpand(entry.path)}
        />
      );
    },
    [visibleEntries, expandedPaths, selectedPath, searchQuery, onSelectEntry, onToggleExpand, handleContextMenu],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" role="tree">
      {/* Expand/collapse toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-base bg-surface-secondary flex-shrink-0">
        <span className="text-xs text-muted">
          {visibleEntries.length} {visibleEntries.length === 1 ? "item" : "items"}
        </span>
        <div className="flex-1" />
        <button
          onClick={onExpandAll}
          className="text-xs text-secondary hover:text-main"
        >
          Expand all
        </button>
        <span className="text-muted">·</span>
        <button
          onClick={onCollapseAll}
          className="text-xs text-secondary hover:text-main"
        >
          Collapse all
        </button>
      </div>

      {/* Virtual list */}
      <div className="flex-1 custom-scrollbar">
        {visibleEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary text-sm">
            No entries match your filters.
          </div>
        ) : (
          <FixedSizeList
            ref={listRef}
            height={height - 36} // subtract header height
            itemCount={visibleEntries.length}
            itemSize={ROW_HEIGHT}
            width="100%"
          >
            {renderRow}
          </FixedSizeList>
        )}
      </div>

      {contextMenu && (
        <EntryContextMenu
          entry={contextMenu.entry}
          position={contextMenu.position}
          copiedId={contextMenu.copiedId}
          onClose={() => setContextMenu(null)}
          onPreview={() => onSelectEntry(contextMenu.entry.path)}
          onOpenInNewTab={() => onOpenInNewTab(contextMenu.entry)}
          onCopyPath={() => handleCopyPath(contextMenu.entry)}
          onCopyContent={() => onCopyContent(contextMenu.entry)}
          onExtractFile={() => onExtractFile(contextMenu.entry)}
          onExtractSubtree={() => onExtractSubtree(contextMenu.entry)}
          onInspectNested={() => onInspectNested(contextMenu.entry)}
        />
      )}
    </div>
  );
};
