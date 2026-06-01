import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SmartViewProps } from "../../../../views/registry";
import { useHarData } from "../hooks/useHarData";
import { ProcessedEntry, MainTab } from "../types";
import { HarPrivacyBanner } from "./HarPrivacyBanner";
import { HarSummaryBar } from "./HarSummaryBar";
import { HarToolbar } from "./HarToolbar";
import { HarWaterfall } from "./HarWaterfall";
import { HarTable } from "./HarTable";
import { HarRequestDetail } from "./HarRequestDetail";
import { HarCompareModal } from "./HarCompareModal";
import { HarMergeModal } from "./HarMergeModal";
import {
  deleteHarEntries,
  mergeHarContent,
  serializeHar,
} from "../utils/harEntryOperations";

export const HarViewer: React.FC<SmartViewProps> = ({ content, onContentChange }) => {
  const [activeTab, setActiveTab] = useState<MainTab>("waterfall");
  const [selectedEntry, setSelectedEntry] = useState<ProcessedEntry | null>(null);
  const [selectedEntryIndexes, setSelectedEntryIndexes] = useState<Set<number>>(new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const {
    file,
    entries,
    filteredEntries,
    summary,
    error,
    filter,
    setFilter,
    resetFilter,
    exportFilteredHar,
    exportAsCsv,
    buildCurlCommand,
  } = useHarData(content);

  const handleSelectEntry = useCallback((entry: ProcessedEntry | null) => {
    setSelectedEntry(entry);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  useEffect(() => {
    setSelectedEntry(null);
    setSelectedEntryIndexes(new Set());
    setShowCompareModal(false);
  }, [content]);

  const allVisibleSelected = useMemo(
    () =>
      filteredEntries.length > 0 &&
      filteredEntries.every((entry) => selectedEntryIndexes.has(entry.index)),
    [filteredEntries, selectedEntryIndexes],
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryIndexes.has(entry.index)),
    [entries, selectedEntryIndexes],
  );

  const handleToggleEntrySelection = useCallback((index: number) => {
    setSelectedEntryIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleToggleAllVisible = useCallback(() => {
    setSelectedEntryIndexes((prev) => {
      const next = new Set(prev);
      if (filteredEntries.length > 0 && filteredEntries.every((entry) => next.has(entry.index))) {
        filteredEntries.forEach((entry) => next.delete(entry.index));
      } else {
        filteredEntries.forEach((entry) => next.add(entry.index));
      }
      return next;
    });
  }, [filteredEntries]);

  const handleDeleteSelected = useCallback(() => {
    if (!file || selectedEntryIndexes.size === 0) return;
    const nextFile = deleteHarEntries(file, selectedEntryIndexes);
    onContentChange(serializeHar(nextFile));
  }, [file, onContentChange, selectedEntryIndexes]);

  const handleCompareSelected = useCallback(() => {
    if (selectedEntries.length === 2) setShowCompareModal(true);
  }, [selectedEntries]);

  const handleMerge = useCallback(
    (incomingContent: string): string | null => {
      const result = mergeHarContent(content, incomingContent);
      if (!result.file) return result.error ?? "Unable to merge HAR content";
      onContentChange(serializeHar(result.file));
      return null;
    },
    [content, onContentChange],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface text-center px-8 gap-3">
        <p className="text-danger font-medium">Failed to parse HAR file</p>
        <pre className="text-xs text-secondary bg-element rounded p-3 max-w-lg overflow-auto">{error}</pre>
      </div>
    );
  }

  if (!file || !summary) {
    return (
      <div className="flex items-center justify-center h-full bg-surface text-secondary text-sm">
        Loading…
      </div>
    );
  }

  const curlCommand = selectedEntry ? buildCurlCommand(selectedEntry) : "";

  return (
    <div className="flex flex-col h-full bg-surface" data-testid="har-viewer">
      {/* Privacy warning (only when sensitive data detected) */}
      {summary.hasSensitiveData && (
        <HarPrivacyBanner sensitiveDataTypes={summary.sensitiveDataTypes} />
      )}

      {/* Summary stats bar */}
      <HarSummaryBar summary={summary} filteredCount={filteredEntries.length} />

      {/* Toolbar with view tabs and filters */}
      <HarToolbar
        filter={filter}
        summary={summary}
        onFilterChange={setFilter}
        onResetFilter={resetFilter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        exportFilteredHar={exportFilteredHar}
        exportAsCsv={exportAsCsv}
        pages={file.log.pages}
        selectedCount={selectedEntryIndexes.size}
        canCompareSelected={selectedEntries.length === 2}
        onDeleteSelected={handleDeleteSelected}
        onCompareSelected={handleCompareSelected}
        onOpenMerge={() => setShowMergeModal(true)}
      />

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        {selectedEntry ? (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={60} minSize={30} className="flex flex-col min-h-0">
              {activeTab === "waterfall" ? (
                <HarWaterfall
                  entries={filteredEntries}
                  selectedId={selectedEntry?.id ?? null}
                  onSelectEntry={handleSelectEntry}
                  selectedEntryIndexes={selectedEntryIndexes}
                  onToggleEntrySelection={handleToggleEntrySelection}
                  onToggleAllVisible={handleToggleAllVisible}
                  allVisibleSelected={allVisibleSelected}
                />
              ) : (
                <HarTable
                  entries={filteredEntries}
                  selectedId={selectedEntry?.id ?? null}
                  onSelectEntry={handleSelectEntry}
                  selectedEntryIndexes={selectedEntryIndexes}
                  onToggleEntrySelection={handleToggleEntrySelection}
                  onToggleAllVisible={handleToggleAllVisible}
                  allVisibleSelected={allVisibleSelected}
                />
              )}
            </Panel>

            <PanelResizeHandle className="w-1 bg-base hover:bg-primary/30 transition-colors cursor-col-resize" />

            <Panel defaultSize={40} minSize={25} className="flex flex-col min-h-0">
              <HarRequestDetail
                entry={selectedEntry}
                curlCommand={curlCommand}
                onClose={handleCloseDetail}
              />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="flex flex-col h-full">
            {activeTab === "waterfall" ? (
              <HarWaterfall
                entries={filteredEntries}
                selectedId={null}
                onSelectEntry={handleSelectEntry}
                selectedEntryIndexes={selectedEntryIndexes}
                onToggleEntrySelection={handleToggleEntrySelection}
                onToggleAllVisible={handleToggleAllVisible}
                allVisibleSelected={allVisibleSelected}
              />
            ) : (
              <HarTable
                entries={filteredEntries}
                selectedId={null}
                onSelectEntry={handleSelectEntry}
                selectedEntryIndexes={selectedEntryIndexes}
                onToggleEntrySelection={handleToggleEntrySelection}
                onToggleAllVisible={handleToggleAllVisible}
                allVisibleSelected={allVisibleSelected}
              />
            )}
          </div>
        )}
      </div>

      {showCompareModal && selectedEntries.length === 2 && (
        <HarCompareModal
          entries={[selectedEntries[0], selectedEntries[1]]}
          onClose={() => setShowCompareModal(false)}
        />
      )}
      {showMergeModal && (
        <HarMergeModal
          onMerge={handleMerge}
          onClose={() => setShowMergeModal(false)}
        />
      )}
    </div>
  );
};
