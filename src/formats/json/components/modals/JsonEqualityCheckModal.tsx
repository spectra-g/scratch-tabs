import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { BaseModal } from "./BaseModal";
import {
  compareJsonEquality,
  EqualityResult,
  DifferenceDetail,
} from "../../utils/jsonDeepEquality";
import { CheckCircle2, XCircle, Info, GitCompare, ArrowLeft } from "lucide-react";
import { useDebounce } from "../../../../hooks/useDebounce";
import { MonacoDiffViewer } from "../../../../components/MonacoDiffViewer";
import { prepareArrayPairForDiff } from "../../utils/arrayDiffPreparation";
import { LoadFromTabDropdown } from "./LoadFromTabDropdown";
import { useTabsStore } from "../../../../stores/tabsStore";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { getRecentJsonTabs } from "../../../../utils/jsonTabHelpers";
import { modelManager } from "../../../../services/modelManager";
import { useThemeStore } from "../../../../stores/themeStore";

interface JsonEqualityCheckModalProps {
  sourceJson: string;
  sourceTabId: string; // ID of the current tab (for filtering)
  onClose: () => void;
}

/**
 * Component to preview JSON values in a formatted, readable way.
 * Handles both compact and multiline display based on content.
 */
const ValuePreview: React.FC<{ value: any }> = ({ value }) => {
  if (value === undefined) return null;

  const content = JSON.stringify(value, null, 2);
  const isShort = content.length < 80 && !content.includes("\n");

  return (
    <pre
      className={`p-2 rounded text-xs custom-scrollbar ${
        isShort ? "inline-block" : "max-h-24 overflow-auto"
      } bg-themed/70 border border-themed/50`}
    >
      <code>{content}</code>
    </pre>
  );
};

/**
 * Component to display a single difference with rich formatting.
 * Shows path, type, message, and side-by-side value comparison.
 * For array mismatches, provides a "Show Diff" button to view detailed comparison.
 */
const DifferenceItem: React.FC<{
  diff: DifferenceDetail;
  onShowDiff: (diff: DifferenceDetail) => void;
}> = ({ diff, onShowDiff }) => (
  <div className="mb-4 pb-4 border-b border-themed/60 last:border-b-0 last:mb-0 last:pb-0">
    {/* Header: Path and Type */}
    <div className="flex items-center justify-between mb-2">
      <code className="text-sm text-themed-secondary bg-themed-tertiary/50 px-2 py-1 rounded">
        {diff.path}
      </code>
      <span className="text-xs font-semibold text-red-400 px-2 py-1 bg-red-900/30 rounded-full">
        {diff.type.replace(/_/g, " ")}
      </span>
    </div>

    {/* Message */}
    <p className="text-sm text-themed-secondary mb-3">{diff.message}</p>

    {/* Value Comparison */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      <div>
        <span className="font-semibold text-themed-tertiary block mb-1">
          Source Value:
        </span>
        <ValuePreview value={diff.leftValue} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-themed-tertiary">Target Value:</span>
          {diff.type === "ARRAY_CONTENT_MISMATCH" &&
            Array.isArray(diff.leftValue) &&
            Array.isArray(diff.rightValue) && (
              <button
                onClick={() => onShowDiff(diff)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                title="Show side-by-side diff with smart sorting"
              >
                <GitCompare size={14} />
                <span>Show Diff</span>
              </button>
            )}
        </div>
        <ValuePreview value={diff.rightValue} />
      </div>
    </div>
  </div>
);

/**
 * Modal for deep equality checking of JSON objects.
 * Features:
 * - Order-insensitive comparison for objects and arrays
 * - Intelligent array analysis (matched, missing, extra items)
 * - Rich difference reporting with value previews
 * - Spacious layout with dedicated results area
 */
export const JsonEqualityCheckModal: React.FC<JsonEqualityCheckModalProps> = ({
  sourceJson,
  sourceTabId,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();
  const [targetJson, setTargetJson] = useState("");
  const [result, setResult] = useState<EqualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDiff, setActiveDiff] = useState<DifferenceDetail | null>(null);

  // Get tabs and workspace for "Load from" dropdown
  const { tabs } = useTabsStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const recentJsonTabs = getRecentJsonTabs(
    tabs,
    sourceTabId,
    activeWorkspaceId || ""
  );

  // Debounce to avoid excessive computation while typing
  const debouncedTargetJson = useDebounce(targetJson, 400);

  // Handler to show diff view
  const handleShowDiff = (diff: DifferenceDetail) => {
    setActiveDiff(diff);
  };

  // Handler to close diff view and return to summary
  const handleCloseDiff = () => {
    setActiveDiff(null);
  };

  // Handler to load content from another tab
  const handleLoadFromTab = (tabId: string) => {
    const selectedTab = tabs.find((tab) => tab.id === tabId);
    if (!selectedTab) return;

    // Get content from modelManager or tab store
    let content = modelManager.getContent(tabId);
    if (!content && selectedTab.content) {
      content = selectedTab.content;
    }

    if (content) {
      setTargetJson(content);
    }
  };

  // Run comparison when target JSON changes
  useEffect(() => {
    if (!debouncedTargetJson.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    try {
      const comparisonResult = compareJsonEquality(
        sourceJson,
        debouncedTargetJson
      );
      setResult(comparisonResult);
      setError(null);
    } catch (err: any) {
      setError(err.message || "An error occurred during comparison");
      setResult(null);
    }
  }, [sourceJson, debouncedTargetJson]);

  return (
    <BaseModal
      title="Deep JSON Equality Check"
      onClose={onClose}
      maxWidthClass="max-w-7xl"
      maxHeightClass="max-h-[95vh]"
    >
      <div className={`flex flex-col ${activeDiff ? 'h-[85vh]' : ''}`}>
        {/* Top Section: Editors (hidden when showing diff) */}
        {!activeDiff && (
          <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-[45vh]">
          {/* Source Editor (Read-only) */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-themed-secondary mb-2">
              Source JSON (Current)
            </h3>
            <div className="flex-1 border border-themed/50 rounded-lg overflow-hidden min-h-0">
              <Editor
                height="100%"
                language="json"
                value={sourceJson}
                theme={isDarkMode ? "vs-dark" : "vs"}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            </div>
          </div>

          {/* Target Editor (Editable) */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-themed-secondary">
                Target JSON (To Compare)
              </h3>
              <LoadFromTabDropdown
                recentJsonTabs={recentJsonTabs}
                onLoadFromTab={handleLoadFromTab}
              />
            </div>
            <div className="flex-1 border border-themed/50 rounded-lg overflow-hidden min-h-0">
              <Editor
                height="100%"
                language="json"
                value={targetJson}
                onChange={(value) => setTargetJson(value || "")}
                theme={isDarkMode ? "vs-dark" : "vs"}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Bottom Section: Results or Diff View */}
        <div
          className={`flex flex-col bg-themed-secondary/30 ${
            activeDiff
              ? "flex-1 min-h-0 border-t border-themed/60"
              : "flex-none p-4 border-t border-themed/60 min-h-[250px] max-h-[45vh]"
          }`}
        >
          {activeDiff ? (
            // Diff View Mode
            <>
              {/* Diff Header */}
              <div className="flex-none flex items-center justify-between p-3 border-b border-themed/60">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCloseDiff}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-themed-tertiary hover:bg-slate-300 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                    title="Return to comparison summary"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Summary</span>
                  </button>
                  <div className="border-l border-themed/60 pl-3">
                    <h3 className="text-sm font-medium text-themed-secondary">
                      Array Difference at:{" "}
                      <code className="bg-themed-tertiary/50 px-2 py-1 rounded text-xs">
                        {activeDiff.path}
                      </code>
                    </h3>
                    <p className="text-xs text-themed-tertiary mt-0.5">
                      Smart-sorted for easier comparison (objects keys sorted,
                      array elements sorted by content)
                    </p>
                  </div>
                </div>
              </div>

              {/* Diff Viewer Content */}
              <div className="flex-1 min-h-0 border-x border-b border-themed/50">
                {(() => {
                  const prepared = prepareArrayPairForDiff(
                    activeDiff.leftValue,
                    activeDiff.rightValue,
                  );

                  if ("error" in prepared) {
                    return (
                      <div className="flex items-center justify-center h-full text-red-400">
                        <div className="text-center">
                          <XCircle size={24} className="mx-auto mb-2" />
                          <p className="text-sm">{prepared.error}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <MonacoDiffViewer
                      leftContent={prepared.leftContent}
                      rightContent={prepared.rightContent}
                      language="json"
                      leftLabel="Source (Sorted)"
                      rightLabel="Target (Sorted)"
                    />
                  );
                })()}
              </div>
            </>
          ) : (
            // Summary View Mode
            <>
              <h3 className="text-sm font-medium text-themed-secondary mb-3 flex-none">
                Comparison Result
              </h3>

              {/* Scrollable Results Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-themed-secondary/50 p-4 rounded-lg">
            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
                <div className="flex items-start">
                  <XCircle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-1">
                      Comparison Error
                    </div>
                    <div className="text-xs text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !result && (
              <div className="flex items-center justify-center h-full text-themed-tertiary">
                <Info size={18} className="mr-3" />
                <span className="text-sm">
                  Paste or type JSON in the right panel to compare with the source.
                </span>
              </div>
            )}

            {/* Equal State */}
            {!error && result?.isEqual && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle2 size={24} className="mx-auto mb-3 text-green-400" />
                  <span className="font-medium text-lg text-green-300 block">
                    The JSON objects are deeply equal
                  </span>
                  <span className="text-xs text-green-400/70 mt-2 block">
                    Both objects have the same structure, keys, and values
                    (order-insensitive).
                  </span>
                </div>
              </div>
            )}

            {/* Differences State */}
            {!error && result && !result.isEqual && (
              <div>
                {/* Summary Header */}
                <div className="mb-4 p-3 bg-red-900/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center">
                    <XCircle size={18} className="mr-3 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-red-300">
                        Found {result.differences.length} difference
                        {result.differences.length !== 1 ? "s" : ""}
                      </div>
                      <div className="text-xs text-red-400/70 mt-0.5">
                        Arrays are compared order-insensitively as multisets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difference List */}
                <div>
                  {result.differences.map((diff, index) => (
                    <DifferenceItem
                      key={index}
                      diff={diff}
                      onShowDiff={handleShowDiff}
                    />
                  ))}
                </div>
              </div>
            )}
              </div>

              {/* Info Footer */}
              <div className="flex-none pt-3 mt-3 border-t border-themed/50">
                <div className="text-xs text-themed-muted">
                  <span className="font-medium">Note:</span> Comparison is
                  order-insensitive for both object keys and array elements.
                  Arrays are treated as multisets (duplicates are preserved).
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
