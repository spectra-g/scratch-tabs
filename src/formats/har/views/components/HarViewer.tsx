import React, { useState, useCallback } from "react";
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

export const HarViewer: React.FC<SmartViewProps> = ({ content }) => {
  const [activeTab, setActiveTab] = useState<MainTab>("waterfall");
  const [selectedEntry, setSelectedEntry] = useState<ProcessedEntry | null>(null);

  const {
    file,
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
      />

      {/* Main content area */}
      <div className="flex-1 min-h-0">
        {selectedEntry ? (
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={60} minSize={30} className="flex flex-col min-h-0">
              {activeTab === "waterfall" ? (
                <HarWaterfall
                  entries={filteredEntries}
                  summary={summary}
                  selectedId={selectedEntry?.id ?? null}
                  onSelectEntry={handleSelectEntry}
                />
              ) : (
                <HarTable
                  entries={filteredEntries}
                  selectedId={selectedEntry?.id ?? null}
                  onSelectEntry={handleSelectEntry}
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
                summary={summary}
                selectedId={null}
                onSelectEntry={handleSelectEntry}
              />
            ) : (
              <HarTable
                entries={filteredEntries}
                selectedId={null}
                onSelectEntry={handleSelectEntry}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
