import React, { useState, useMemo, useCallback, useRef } from "react";
import { BaseModal } from "../../../../components/Modals/BaseModal";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { parse as parseWithSourceMap } from "json-source-map";
import { ChevronDown, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";
import { Tab } from "../../../../types";
import { createTab } from "../../../../utils/tabUtils";
import { useThemeStore } from "../../../../stores/themeStore";
import {
  generateDocPaths,
  generateDocumentationJson,
  createDefaultConfig,
  getNextMode,
  getModeDisplay,
  DocExportMode,
} from "../../utils/documentationGenerator";

/**
 * Calculate the depth of a path.
 * "name" -> 1
 * "user.name" -> 2
 * "users[0].name" -> 3
 */
function getPathDepth(path: string): number {
  // Count dots and array brackets as depth separators
  const parts = path.split(/\.|\[/).filter(Boolean);
  return parts.length;
}

/**
 * Group paths by their depth level.
 */
function groupPathsByDepth(paths: string[]): Map<number, string[]> {
  const groups = new Map<number, string[]>();

  for (const path of paths) {
    const depth = getPathDepth(path);
    if (!groups.has(depth)) {
      groups.set(depth, []);
    }
    groups.get(depth)!.push(path);
  }

  return groups;
}

/**
 * Get a human-readable label for a depth level.
 */
function getDepthLabel(depth: number): string {
  if (depth === 1) return "Top Level";
  return `Level ${depth}`;
}

interface DocumentationExportModalProps {
  jsonString: string;
  onClose: () => void;
  addTab: (tab: Tab) => void;
}

/**
 * Convert dot-notation path to JSON Pointer format for json-source-map.
 */
function pathToJsonPointer(path: string): string {
  if (!path || !path.trim()) return "";
  const normalized = path.trim().replace(/\[/g, ".").replace(/\]/g, "");
  const parts = normalized.split(".").filter(Boolean);
  return "/" + parts.join("/");
}

export const DocumentationExportModal: React.FC<DocumentationExportModalProps> = ({
  jsonString,
  onClose,
  addTab,
}) => {
  const { isDarkMode } = useThemeStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Parse JSON once
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }, [jsonString]);

  // Extract all paths
  const allPaths = useMemo(() => {
    if (!parsedJson) return [];
    return generateDocPaths(parsedJson);
  }, [parsedJson]);

  // Group paths by depth
  const groupedPaths = useMemo(() => {
    return groupPathsByDepth(allPaths);
  }, [allPaths]);

  // Track which depth groups are expanded (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    return new Set(groupedPaths.keys());
  });

  // Initialize config with all paths set to 'keep'
  const [config, setConfig] = useState<Record<string, DocExportMode>>(() =>
    createDefaultConfig(allPaths)
  );

  // Toggle mode for a path
  const toggleMode = useCallback((path: string) => {
    setConfig((prev) => ({
      ...prev,
      [path]: getNextMode(prev[path] || "keep"),
    }));
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((depth: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(depth)) {
        next.delete(depth);
      } else {
        next.add(depth);
      }
      return next;
    });
  }, []);

  // Set all paths in a specific depth group to a mode
  const setGroupMode = useCallback(
    (depth: number, mode: DocExportMode) => {
      const pathsInGroup = groupedPaths.get(depth) || [];
      setConfig((prev) => {
        const next = { ...prev };
        for (const path of pathsInGroup) {
          next[path] = mode;
        }
        return next;
      });
    },
    [groupedPaths]
  );

  // Generate transformed JSON preview
  const transformedJson = useMemo(() => {
    if (!parsedJson) return null;
    return generateDocumentationJson(parsedJson, config);
  }, [parsedJson, config]);

  const transformedJsonString = useMemo(() => {
    if (transformedJson === null) return "// Invalid JSON";
    try {
      return JSON.stringify(transformedJson, null, 2);
    } catch {
      return "// Error generating preview";
    }
  }, [transformedJson]);

  // Open in new tab
  const handleOpenInNewTab = useCallback(() => {
    addTab(
      createTab({
        title: "Documentation Sample",
        content: transformedJsonString,
        language: "json",
      })
    );
    onClose();
  }, [addTab, transformedJsonString, onClose]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transformedJsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [transformedJsonString]);

  // Navigate to path in preview editor
  const navigateToPath = useCallback((path: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const content = editor.getValue();
      const { pointers } = parseWithSourceMap(content);
      const jsonPointer = pathToJsonPointer(path);
      const location = pointers[jsonPointer];

      if (location) {
        const targetLine = (location.key?.line ?? location.value?.line ?? 0) + 1;
        const targetColumn = (location.key?.column ?? location.value?.column ?? 0) + 1;

        editor.revealLineInCenter(targetLine);
        editor.setPosition({ lineNumber: targetLine, column: targetColumn });

        // Highlight the line briefly
        if (location.valueEnd) {
          const range = new monaco.Range(
            targetLine,
            targetColumn,
            location.valueEnd.line + 1,
            location.valueEnd.column + 1
          );
          editor.setSelection(range);
        }

        editor.focus();
      }
    } catch (error) {
      console.error("Failed to navigate to path:", error);
    }
  }, []);

  // Bulk actions
  const setAllPaths = useCallback((mode: DocExportMode) => {
    const newConfig: Record<string, DocExportMode> = {};
    for (const path of allPaths) {
      newConfig[path] = mode;
    }
    setConfig(newConfig);
  }, [allPaths]);

  // Handle editor mount
  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
    },
    []
  );

  if (!parsedJson) {
    return (
      <BaseModal
        title="Export for Documentation"
        onClose={onClose}
        maxWidthClass="max-w-5xl"
      >
        <div className="p-4">
          <p className="text-danger">Invalid JSON. Please fix errors first.</p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      title="Export for Documentation"
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      maxHeightClass="max-h-[80vh]"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Bulk Actions */}
        <div className="flex-none p-3 border-b border-base bg-surface-secondary">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary mr-2">Set all to:</span>
            <button
              onClick={() => setAllPaths("keep")}
              className="px-2 py-1 text-xs rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
            >
              Keep
            </button>
            <button
              onClick={() => setAllPaths("keep-one")}
              className="px-2 py-1 text-xs rounded bg-success/30 text-success hover:bg-success/40 transition-colors"
              title="Keep only first item in arrays"
            >
              Keep 1
            </button>
            <button
              onClick={() => setAllPaths("mask-value")}
              className="px-2 py-1 text-xs rounded bg-warning/20 text-warning hover:bg-warning/30 transition-colors"
            >
              Mask
            </button>
            <button
              onClick={() => setAllPaths("mask-type")}
              className="px-2 py-1 text-xs rounded bg-info/20 text-info hover:bg-info/30 transition-colors"
            >
              Type
            </button>
            <button
              onClick={() => setAllPaths("remove")}
              className="px-2 py-1 text-xs rounded bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left column: Path list (40%) */}
          <div className="w-2/5 border-r border-base flex flex-col">
            <div className="flex-none p-3 border-b border-base bg-surface-secondary">
              <h3 className="text-sm font-medium text-main">
                Paths ({allPaths.length})
              </h3>
              <p className="text-xs text-secondary mt-1">
                Click badges to cycle: Keep &rarr; Keep 1 &rarr; Mask &rarr; Type &rarr; Remove
              </p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {Array.from(groupedPaths.entries())
                .sort(([a], [b]) => a - b)
                .map(([depth, paths]) => {
                  const isExpanded = expandedGroups.has(depth);
                  return (
                    <div key={depth} className="border-b border-base">
                      {/* Group Header */}
                      <div
                        className="flex items-center justify-between px-3 py-2 bg-element hover:bg-element-hover cursor-pointer sticky top-0 z-10"
                        onClick={() => toggleGroup(depth)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-secondary" />
                          ) : (
                            <ChevronRight size={14} className="text-secondary" />
                          )}
                          <span className="text-xs font-medium text-main">
                            {getDepthLabel(depth)}
                          </span>
                          <span className="text-xs text-secondary">
                            ({paths.length})
                          </span>
                        </div>
                        {/* Quick set buttons for group */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setGroupMode(depth, "keep")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-success/20 text-success hover:bg-success/30"
                            title="Set all in group to Keep"
                          >
                            K
                          </button>
                          <button
                            onClick={() => setGroupMode(depth, "keep-one")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-success/30 text-success hover:bg-success/40"
                            title="Set all in group to Keep 1"
                          >
                            K1
                          </button>
                          <button
                            onClick={() => setGroupMode(depth, "mask-value")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-warning/20 text-warning hover:bg-warning/30"
                            title="Set all in group to Mask"
                          >
                            M
                          </button>
                          <button
                            onClick={() => setGroupMode(depth, "mask-type")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-info/20 text-info hover:bg-info/30"
                            title="Set all in group to Type"
                          >
                            T
                          </button>
                          <button
                            onClick={() => setGroupMode(depth, "remove")}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-danger/20 text-danger hover:bg-danger/30"
                            title="Set all in group to Remove"
                          >
                            R
                          </button>
                        </div>
                      </div>
                      {/* Group Paths */}
                      {isExpanded && (
                        <div>
                          {paths.map((path) => {
                            const mode = config[path] || "keep";
                            const display = getModeDisplay(mode);
                            // Get just the last segment for display
                            const lastSegment = path.split(/\.(?=[^.]*$)/).pop() || path;
                            return (
                              <div
                                key={path}
                                className="flex items-center justify-between px-3 py-1.5 hover:bg-element-hover border-t border-base/50"
                              >
                                <button
                                  onClick={() => navigateToPath(path)}
                                  className="text-xs text-main font-mono truncate flex-1 mr-2 pl-5 text-left hover:text-info transition-colors"
                                  title={`Click to navigate: ${path}`}
                                >
                                  {lastSegment}
                                </button>
                                <button
                                  onClick={() => toggleMode(path)}
                                  className={`flex-none px-2 py-0.5 text-xs rounded font-medium transition-colors ${display.bgClass} ${display.colorClass} hover:opacity-80`}
                                >
                                  {display.label}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              {allPaths.length === 0 && (
                <div className="p-4 text-center text-secondary text-sm">
                  No paths found in JSON
                </div>
              )}
            </div>
          </div>

          {/* Right column: Preview (60%) */}
          <div className="w-3/5 flex flex-col">
            <div className="flex-none p-3 border-b border-base bg-surface-secondary flex items-center justify-between">
              <h3 className="text-sm font-medium text-main">Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded transition-colors ${
                    isCopied
                      ? "bg-success/20 text-success"
                      : "bg-element hover:bg-element-hover text-main"
                  }`}
                  title="Copy to clipboard"
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  {isCopied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-primary hover:bg-primary-hover text-white rounded transition-colors"
                >
                  <ExternalLink size={12} />
                  Open in New Tab
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                language="json"
                value={transformedJsonString}
                theme={isDarkMode ? "vs-dark" : "vs"}
                onMount={handleEditorMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
