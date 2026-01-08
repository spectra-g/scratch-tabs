import React, { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useRootStore } from "../../stores/rootStore";
import Editor from "@monaco-editor/react";

interface SplitTabModalProps {
  tabId: string;
  onClose: () => void;
}

type SplitMethod = "delimiter" | "lines";
type DelimiterHandling = "discard" | "keepPrevious" | "keepNext";

/**
 * Configuration for splitting a tab into multiple tabs
 */
interface SplitConfig {
  method: SplitMethod;
  delimiter: string;
  useRegex: boolean;
  delimiterHandling: DelimiterHandling;
  skipFirstMatches: number;
  linesPerTab: number;
  headerLines: number;
  footerLines: number;
  replicateHeader: boolean;
  replicateFooter: boolean;
  titlePattern: string;
  keepOriginal: boolean;
}

/**
 * Result of splitting a tab
 */
interface SplitResult {
  title: string;
  content: string;
}

/**
 * Modal for splitting a tab into multiple tabs based on delimiters or line count.
 * Features:
 * - Split by delimiter (text or regex) or by number of lines
 * - Skip first N delimiter matches
 * - Replicate header/footer lines across all split tabs
 * - Live preview of split results
 * - Customizable title patterns
 */

export const SplitTabModal: React.FC<SplitTabModalProps> = ({
  tabId,
  onClose,
}) => {
  const tabsStore = useTabsStore();
  const rootStore = useRootStore();
  const tab = tabsStore.tabs.find((t) => t.id === tabId);

  const [config, setConfig] = useState<SplitConfig>({
    method: "delimiter",
    delimiter: "\\n\\n",
    useRegex: true,
    delimiterHandling: "discard",
    skipFirstMatches: 0,
    linesPerTab: 100,
    headerLines: 0,
    footerLines: 0,
    replicateHeader: false,
    replicateFooter: false,
    titlePattern: "{title} - Part {n}",
    keepOriginal: false,
  });

  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);

  // Split logic
  const splitResults = useMemo((): SplitResult[] => {
    if (!tab || !tab.content) return [];

    const content = tab.content;
    const lines = content.split("\n");

    let parts: string[] = [];

    if (config.method === "delimiter") {
      if (!config.delimiter) {
        return [];
      }

      try {
        if (config.useRegex) {
          const regex = new RegExp(config.delimiter, "g");
          const matches = Array.from(content.matchAll(regex));

          // If we need to skip matches, handle the prefix
          let prefix = "";
          let workingContent = content;

          if (config.skipFirstMatches > 0 && matches.length > 0) {
            const skipCount = Math.min(config.skipFirstMatches, matches.length);
            const lastSkippedMatch = matches[skipCount - 1];
            const splitPoint = lastSkippedMatch.index! + lastSkippedMatch[0].length;
            prefix = content.substring(0, splitPoint);
            workingContent = content.substring(splitPoint);
          }

          // Now split the working content
          const splits = workingContent.split(regex);
          const workingMatches = Array.from(workingContent.matchAll(regex));

          if (config.delimiterHandling === "discard") {
            parts = splits;
          } else if (config.delimiterHandling === "keepPrevious") {
            parts = splits.map((part, i) =>
              i < splits.length - 1 && i < workingMatches.length
                ? part + workingMatches[i][0]
                : part
            );
          } else if (config.delimiterHandling === "keepNext") {
            parts = splits.map((part, i) =>
              i > 0 && i - 1 < workingMatches.length
                ? workingMatches[i - 1][0] + part
                : part
            );
          }

          // Add prefix to first part if we skipped matches
          if (prefix && parts.length > 0) {
            parts[0] = prefix + parts[0];
          } else if (prefix && parts.length === 0) {
            parts = [prefix];
          }
        } else {
          const delimiter = config.delimiter;

          // Handle skipping for literal delimiter
          let prefix = "";
          let workingContent = content;

          if (config.skipFirstMatches > 0) {
            let skipCount = 0;
            let searchPos = 0;

            while (skipCount < config.skipFirstMatches) {
              const foundPos = content.indexOf(delimiter, searchPos);
              if (foundPos === -1) break;
              searchPos = foundPos + delimiter.length;
              skipCount++;
            }

            if (searchPos > 0) {
              prefix = content.substring(0, searchPos);
              workingContent = content.substring(searchPos);
            }
          }

          const splits = workingContent.split(delimiter);

          if (config.delimiterHandling === "discard") {
            parts = splits;
          } else if (config.delimiterHandling === "keepPrevious") {
            parts = splits.map((part, i) =>
              i < splits.length - 1 ? part + delimiter : part
            );
          } else if (config.delimiterHandling === "keepNext") {
            parts = splits.map((part, i) =>
              i > 0 ? delimiter + part : part
            );
          }

          // Add prefix to first part if we skipped matches
          if (prefix && parts.length > 0) {
            parts[0] = prefix + parts[0];
          } else if (prefix && parts.length === 0) {
            parts = [prefix];
          }
        }
      } catch (error) {
        console.error("Invalid regex:", error);
        return [];
      }
    } else {
      // Split by lines
      const linesPerTab = Math.max(1, config.linesPerTab);
      for (let i = 0; i < lines.length; i += linesPerTab) {
        parts.push(lines.slice(i, i + linesPerTab).join("\n"));
      }
    }

    // Filter empty parts
    parts = parts.filter((part) => part.trim().length > 0);

    // Apply header/footer replication
    const headerContent =
      config.replicateHeader && config.headerLines > 0
        ? lines.slice(0, config.headerLines).join("\n") + "\n"
        : "";

    const footerContent =
      config.replicateFooter && config.footerLines > 0
        ? "\n" + lines.slice(-config.footerLines).join("\n")
        : "";

    // Generate results
    return parts.map((part, index) => {
      const title = config.titlePattern
        .replace("{title}", tab.title || "Untitled")
        .replace("{n}", String(index + 1));

      let finalContent = part;

      // Add header to all parts except the first (which already has it)
      if (config.replicateHeader && config.headerLines > 0 && index > 0) {
        finalContent = headerContent + finalContent;
      }

      // Add footer to all parts except the last (which already has it)
      if (
        config.replicateFooter &&
        config.footerLines > 0 &&
        index < parts.length - 1
      ) {
        finalContent = finalContent + footerContent;
      }

      return {
        title,
        content: finalContent,
      };
    });
  }, [tab, config]);

  // Auto-select first result when results change
  useEffect(() => {
    if (splitResults.length > 0 && selectedPreviewIndex >= splitResults.length) {
      setSelectedPreviewIndex(0);
    }
  }, [splitResults.length, selectedPreviewIndex]);

  const handleApplySplit = async () => {
    if (splitResults.length === 0) return;

    // Determine which side the original tab is on
    const splitViewStore = useSplitViewStore.getState();
    const isOnRightSide = splitViewStore.splitView.rightTabs.includes(tabId);

    // Create new tabs
    for (const result of splitResults) {
      await rootStore.handleNewPopulatedTab(
        {
          title: result.title,
          content: result.content,
          language: tab?.language || "plaintext",
          languageLocked: tab?.languageLocked || false,
        },
        isOnRightSide
      );
    }

    // Remove original tab if not keeping it
    if (!config.keepOriginal && tab) {
      rootStore.removeTab(tab.id);
    }

    onClose();
  };

  if (!tab) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden border border-base"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4 border-b border-base bg-surface-highlight">
          <h2 className="text-lg font-medium text-main">
            Split Tab: {tab.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-info"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Two Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane - Configuration */}
          <div className="w-1/3 border-r border-base overflow-y-auto custom-scrollbar p-4 space-y-4">
            {/* Split Method */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Split Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm text-secondary">
                  <input
                    type="radio"
                    checked={config.method === "delimiter"}
                    onChange={() =>
                      setConfig({ ...config, method: "delimiter" })
                    }
                    className="mr-2"
                  />
                  By Delimiter (Text or Regex)
                </label>
                <label className="flex items-center text-sm text-secondary">
                  <input
                    type="radio"
                    checked={config.method === "lines"}
                    onChange={() => setConfig({ ...config, method: "lines" })}
                    className="mr-2"
                  />
                  By Number of Lines
                </label>
              </div>
            </div>

            {/* Delimiter Options */}
            {config.method === "delimiter" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Delimiter
                  </label>
                  <input
                    type="text"
                    value={config.delimiter}
                    onChange={(e) =>
                      setConfig({ ...config, delimiter: e.target.value })
                    }
                    className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="Enter delimiter"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={config.useRegex}
                      onChange={(e) =>
                        setConfig({ ...config, useRegex: e.target.checked })
                      }
                      className="mr-2"
                    />
                    Use Regular Expression
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Delimiter Handling
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm text-secondary">
                      <input
                        type="radio"
                        checked={config.delimiterHandling === "discard"}
                        onChange={() =>
                          setConfig({
                            ...config,
                            delimiterHandling: "discard",
                          })
                        }
                        className="mr-2"
                      />
                      Discard delimiter
                    </label>
                    <label className="flex items-center text-sm text-secondary">
                      <input
                        type="radio"
                        checked={config.delimiterHandling === "keepPrevious"}
                        onChange={() =>
                          setConfig({
                            ...config,
                            delimiterHandling: "keepPrevious",
                          })
                        }
                        className="mr-2"
                      />
                      Keep delimiter at the end of the previous tab
                    </label>
                    <label className="flex items-center text-sm text-secondary">
                      <input
                        type="radio"
                        checked={config.delimiterHandling === "keepNext"}
                        onChange={() =>
                          setConfig({
                            ...config,
                            delimiterHandling: "keepNext",
                          })
                        }
                        className="mr-2"
                      />
                      Keep delimiter at the start of the next tab
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Skip first N matches
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.skipFirstMatches}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        skipFirstMatches: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Skip the first N delimiter matches. Useful for keeping header sections together.
                  </p>
                </div>
              </>
            )}

            {/* Line Count Options */}
            {config.method === "lines" && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Lines per new tab
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.linesPerTab}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      linesPerTab: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                />
              </div>
            )}

            {/* Header/Footer Replication */}
            <div className="border-t border-base pt-4">
              <h3 className="text-sm font-medium text-secondary mb-3">
                Header/Footer Replication
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="flex items-center text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={config.replicateHeader}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          replicateHeader: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Replicate header lines on each new tab
                  </label>
                  {config.replicateHeader && (
                    <input
                      type="number"
                      min="0"
                      value={config.headerLines}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          headerLines: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-2 px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                      placeholder="Number of header lines"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={config.replicateFooter}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          replicateFooter: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Replicate footer lines on each new tab
                  </label>
                  {config.replicateFooter && (
                    <input
                      type="number"
                      min="0"
                      value={config.footerLines}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          footerLines: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full mt-2 px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                      placeholder="Number of footer lines"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Output Options */}
            <div className="border-t border-base pt-4">
              <h3 className="text-sm font-medium text-secondary mb-3">
                Output Options
              </h3>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Title Pattern
                </label>
                <input
                  type="text"
                  value={config.titlePattern}
                  onChange={(e) =>
                    setConfig({ ...config, titlePattern: e.target.value })
                  }
                  className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-info"
                  placeholder="{title} - Part {n}"
                />
                <p className="mt-1 text-xs text-muted">
                  Use {"{title}"} for original title and {"{n}"} for part number
                </p>
              </div>

              <div className="mt-3">
                <label className="flex items-center text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={config.keepOriginal}
                    onChange={(e) =>
                      setConfig({ ...config, keepOriginal: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Keep original tab
                </label>
              </div>
            </div>
          </div>

          {/* Right Pane - Live Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="flex-none p-4 border-b border-base bg-surface-highlight">
              <h3 className="text-sm font-medium text-secondary mb-2">
                Live Preview ({splitResults.length} tab
                {splitResults.length !== 1 ? "s" : ""})
              </h3>

              {/* Tab List */}
              <div className="flex flex-wrap gap-2">
                {splitResults.length === 0 ? (
                  <p className="text-sm text-muted italic">
                    Configure split options to see preview
                  </p>
                ) : (
                  splitResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPreviewIndex(index)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${selectedPreviewIndex === index
                        ? "bg-primary text-white"
                        : "bg-element text-secondary hover:bg-element-hover"
                        }`}
                    >
                      {result.title}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden">
              {splitResults.length > 0 && (
                <Editor
                  height="100%"
                  language={tab.language}
                  value={splitResults[selectedPreviewIndex]?.content || ""}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    fontSize: 13,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="flex-none flex items-center justify-between p-4 border-t border-base bg-surface-highlight">
          <div className="text-sm text-muted">
            {splitResults.length > 0 && (
              <>
                Will create {splitResults.length} new tab
                {splitResults.length !== 1 ? "s" : ""}
                {!config.keepOriginal && " and remove the original"}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-element hover:bg-element-hover text-main rounded text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySplit}
              disabled={splitResults.length === 0}
              className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Split
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
