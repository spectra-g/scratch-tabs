import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Search,
  ChevronsUp,
  ChevronsDown,
  Route,
  ExternalLink,
} from "lucide-react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { useDebounce } from "../../../../hooks/useDebounce";
import { useRootStore } from "../../../../stores";
import { useWorkspaceStore } from "../../../../stores/workspaceStore";
import { useSplitViewStore } from "../../../../stores/splitViewStore";
import { detectLanguage } from "../../../../languages";

// --- Interfaces ---
interface JsonNodeData {
  key: string | number;
  value: any;
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  depth: number;
  path: string;
  childCount?: number;
}

interface VisibleJsonNode extends JsonNodeData {
  isExpanded: boolean;
  isExpandable: boolean;
}

interface JsonTreeViewProps {
  jsonString: string;
}

type SearchMode = "keyValue" | "path";

// --- Helper Functions ---

const buildTree = (
  key: string | number,
  value: any,
  depth: number,
  path: string,
): JsonNodeData => {
  const node: JsonNodeData = {
    key,
    value,
    depth,
    path,
    type: Array.isArray(value)
      ? "array"
      : value === null
        ? "null"
        : typeof value === "object"
          ? "object"
          : (typeof value as any),
  };
  if (node.type === "object" || node.type === "array") {
    node.childCount = Object.keys(value).length;
  }
  return node;
};

const buildVisibleNodes = (
  nodeData: JsonNodeData,
  expandedPaths: Set<string>,
  visibleNodesList: VisibleJsonNode[],
): void => {
  const isExpandable = nodeData.type === "object" || nodeData.type === "array";
  const isExpanded = isExpandable && expandedPaths.has(nodeData.path);
  visibleNodesList.push({ ...nodeData, isExpanded, isExpandable });

  if (isExpandable && isExpanded && nodeData.value) {
    Object.entries(nodeData.value).forEach(([key, value]) => {
      const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
      const childPath = nodeData.path
        ? nodeData.type === "array"
          ? `${nodeData.path}[${childKey}]`
          : `${nodeData.path}.${childKey}`
        : nodeData.type === "array"
          ? `[${childKey}]`
          : String(childKey);
      buildVisibleNodes(
        buildTree(childKey, value, nodeData.depth + 1, childPath),
        expandedPaths,
        visibleNodesList,
      );
    });
  }
};

const getAllExpandablePaths = (
  nodeData: JsonNodeData,
  paths: Set<string>,
): void => {
  if (nodeData.type === "object" || nodeData.type === "array") {
    paths.add(nodeData.path);
    if (nodeData.value) {
      Object.entries(nodeData.value).forEach(([key, value]) => {
        const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
        const childPath = nodeData.path
          ? nodeData.type === "array"
            ? `${nodeData.path}[${childKey}]`
            : `${nodeData.path}.${childKey}`
          : nodeData.type === "array"
            ? `[${childKey}]`
            : String(childKey);
        getAllExpandablePaths(
          buildTree(childKey, value, nodeData.depth + 1, childPath),
          paths,
        );
      });
    }
  }
};

// Basic path evaluator
const evaluateJsonPath = (
  data: any,
  path: string,
): { value: any } | { error: string } => {
  if (!path.trim()) return { value: data };
  try {
    let current: any = data;
    const parts = path.match(/[^.[\]]+/g) || [];
    for (const part of parts) {
      if (current === null || typeof current !== "object")
        return {
          error: `Cannot access property "${part}" on non-object/array value.`,
        };
      const index = parseInt(part, 10);
      if (Array.isArray(current) && !isNaN(index)) {
        if (index >= 0 && index < current.length) current = current[index];
        else
          return {
            error: `Index ${index} out of bounds for path segment "${part}".`,
          };
      } else if (typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return { error: `Path segment "${part}" not found or invalid.` };
      }
    }
    return { value: current };
  } catch (err: any) {
    return { error: err.message || "Invalid path or error during evaluation." };
  }
};

// New helper to get ancestor paths
const getAncestorPaths = (path: string): Set<string> => {
  const ancestors = new Set<string>([""]); // Include root
  if (!path) return ancestors;

  // Improved splitting for paths like a.b[0].c
  const segments = path.match(/[^.[\]]+/g) || [];
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const part = segments[i];
    const isArrayIndex = /^\d+$/.test(part);
    if (i === 0 && !isArrayIndex) {
      currentPath = part;
    } else if (isArrayIndex) {
      currentPath = currentPath ? `${currentPath}[${part}]` : `[${part}]`;
    } else {
      currentPath = currentPath ? `${currentPath}.${part}` : part;
    }
    // Add ancestor path *before* the final segment
    if (i < segments.length - 1) {
      ancestors.add(currentPath);
    }
  }
  return ancestors;
};

// Helper to find all matching nodes in the entire tree structure (not just visible ones)
const findAllMatches = (
  nodeData: JsonNodeData,
  searchTerm: string,
  matchedPaths: Set<string>,
): void => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const keyMatch = String(nodeData.key).toLowerCase().includes(lowerSearchTerm);
  const valueMatch =
    nodeData.type !== "object" &&
    nodeData.type !== "array" &&
    String(nodeData.value).toLowerCase().includes(lowerSearchTerm);

  if (keyMatch || valueMatch) {
    // Add this node and all its ancestors to the matched paths
    const ancestors = getAncestorPaths(nodeData.path);
    ancestors.forEach((ancestorPath) => matchedPaths.add(ancestorPath));
    matchedPaths.add(nodeData.path);
  }

  // Recursively search in children regardless of expansion state
  if (
    (nodeData.type === "object" || nodeData.type === "array") &&
    nodeData.value
  ) {
    Object.entries(nodeData.value).forEach(([key, value]) => {
      const childKey = nodeData.type === "array" ? parseInt(key, 10) : key;
      const childPath = nodeData.path
        ? nodeData.type === "array"
          ? `${nodeData.path}[${childKey}]`
          : `${nodeData.path}.${childKey}`
        : nodeData.type === "array"
          ? `[${childKey}]`
          : String(childKey);
      const childNode = buildTree(
        childKey,
        value,
        nodeData.depth + 1,
        childPath,
      );
      findAllMatches(childNode, searchTerm, matchedPaths);
    });
  }
};

// --- Main Component ---

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ jsonString }) => {
  const [searchMode, setSearchMode] = useState<SearchMode>("keyValue");
  const [inputValue, setInputValue] = useState("");
  const debouncedInputValue = useDebounce(inputValue, 300); // Debounce input value
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([""]),
  );
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<string | null>(null);
  const listRef = useRef<List>(null);
  const [lastValidEvaluatedPath, setLastValidEvaluatedPath] = useState<
    string | null
  >(null);
  const [openedItemId, setOpenedItemId] = useState<string | null>(null);

  const { addBackgroundTab } = useRootStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { splitView } = useSplitViewStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize parsed JSON
  const parsedJson = useMemo(() => {
    setParseError(null); // Clear previous parse errors
    if (!jsonString) return {}; // Treat empty string as empty object
    try {
      return JSON.parse(jsonString);
    } catch (e: any) {
      setParseError(`Invalid JSON: ${e.message}`);
      return null;
    }
  }, [jsonString]);

  // Memoize root node structure
  const rootNodeData = useMemo<JsonNodeData | null>(() => {
    if (parseError || parsedJson === null) return null;
    try {
      return buildTree("", parsedJson, 0, "");
    } catch (e: any) {
      setParseError(`Error building tree: ${e.message}`);
      return null;
    }
  }, [parsedJson, parseError]);

  // Memoize visible nodes based on expansion
  const visibleNodes = useMemo<VisibleJsonNode[]>(() => {
    if (!rootNodeData) return [];
    const visibleNodesList: VisibleJsonNode[] = [];
    buildVisibleNodes(rootNodeData, expandedPaths, visibleNodesList);
    return visibleNodesList.slice(1); // Exclude conceptual root
  }, [rootNodeData, expandedPaths]);

  // Memoize filtered nodes based on search term *and* mode
  const filteredNodes = useMemo<VisibleJsonNode[]>(() => {
    const searchTerm = debouncedInputValue.trim(); // Use debounced value for filtering

    if (!searchTerm) {
      setEvaluationStatus(null); // Clear status on empty input
      return visibleNodes; // Show all visible nodes if input is empty
    }

    if (searchMode === "path") {
      // If a valid path was evaluated, filter to show only ancestors and the target
      if (lastValidEvaluatedPath === searchTerm) {
        // Check if current input matches last valid path
        const ancestors = getAncestorPaths(searchTerm);
        const pathsToShow = new Set([...ancestors, searchTerm]);
        return visibleNodes.filter((node) => pathsToShow.has(node.path));
      } else {
        // If path is invalid or hasn't been successfully evaluated yet, show all
        return visibleNodes;
      }
    } else {
      // keyValue search mode
      // Find all matches in the entire tree structure (not just visible nodes)
      const matchedPaths = new Set<string>();
      if (rootNodeData) {
        findAllMatches(rootNodeData, searchTerm, matchedPaths);
      }

      // Filter visible nodes based on matched paths
      return visibleNodes.filter((node) => matchedPaths.has(node.path));
    }
  }, [visibleNodes, debouncedInputValue, searchMode, lastValidEvaluatedPath]); // Depend on debounced value

  // --- Effect for Path Evaluation / Filtering ---
  useEffect(() => {
    // This effect runs when the *debounced* input value changes
    if (searchMode !== "path") {
      setLastValidEvaluatedPath(null); // Clear path result if not in path mode
      return; // Only evaluate in path mode
    }

    const path = debouncedInputValue.trim();
    if (!path || !parsedJson) {
      setEvaluationStatus(null);
      setLastValidEvaluatedPath(null);
      return;
    }

    const result = evaluateJsonPath(parsedJson, path);
    if ("error" in result) {
      setEvaluationStatus(result.error);
      setLastValidEvaluatedPath(null); // Clear valid path on error
    } else {
      // Path is valid, store it and trigger expansion/scroll
      setEvaluationStatus(`Path evaluated successfully.`); // Simple success message
      setLastValidEvaluatedPath(path); // Store the path that worked
      // Expand necessary nodes (will trigger visibleNodes/filteredNodes recalc)
      const ancestors = getAncestorPaths(path);
      setExpandedPaths((prev) => new Set([...prev, ...ancestors]));
      setSelectedPath(path); // Select the evaluated path
    }
  }, [debouncedInputValue, searchMode, parsedJson]); // Run when debounced input or mode changes

  // --- Effect for Scrolling after state updates ---
  useEffect(() => {
    // Scroll only when a valid path evaluation just happened
    if (searchMode === "path" && lastValidEvaluatedPath && listRef.current) {
      // Find index in the *current* filteredNodes (which should now contain the path)
      const targetIndex = filteredNodes.findIndex(
        (node) => node.path === lastValidEvaluatedPath,
      );
      if (targetIndex !== -1) {
        listRef.current.scrollToItem(targetIndex, "smart");
        setEvaluationStatus(`Found and scrolled to: ${lastValidEvaluatedPath}`);
      } else {
        // This might happen briefly if filtering hasn't caught up, or if the node
        // truly isn't visible (e.g., nested inside a *collapsed* parent that wasn't expanded)
        // The expansion logic should handle most cases.
        setEvaluationStatus(
          `Path evaluated, but node not found in current view.`,
        );
      }
      // Reset lastValidEvaluatedPath to prevent re-scrolling on unrelated renders
      setLastValidEvaluatedPath(null);
    }
  }, [filteredNodes, searchMode, lastValidEvaluatedPath]); // Run when filteredNodes changes AFTER a valid path was set

  // --- Effect for Auto-expanding matched nodes in key/value search ---
  useEffect(() => {
    if (
      searchMode === "keyValue" &&
      debouncedInputValue.trim() &&
      rootNodeData
    ) {
      const searchTerm = debouncedInputValue.trim();
      const matchedPaths = new Set<string>();
      findAllMatches(rootNodeData, searchTerm, matchedPaths);

      // Auto-expand all paths that contain matches
      if (matchedPaths.size > 0) {
        setExpandedPaths((prev) => new Set([...prev, ...matchedPaths]));
      }
    }
  }, [debouncedInputValue, searchMode, rootNodeData]);

  // --- Callbacks ---

  const toggleNode = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleAllNodes = useCallback(
    (expand: boolean) => {
      if (!rootNodeData) return;
      if (expand) {
        const allPaths = new Set<string>([""]);
        getAllExpandablePaths(rootNodeData, allPaths);
        setExpandedPaths(allPaths);
      } else {
        setExpandedPaths(new Set([""]));
      }
    },
    [rootNodeData],
  );

  const copyToClipboard = useCallback(
    async (
      text: string | number | boolean | null | undefined | object,
      type: "key" | "value" | "path",
    ) => {
      let stringToCopy: string;
      if (text === null || text === undefined) {
        stringToCopy = String(text);
      } else if (typeof text === "object") {
        stringToCopy = JSON.stringify(text, null, 2);
      } else {
        stringToCopy = String(text);
      }
      try {
        await navigator.clipboard.writeText(stringToCopy);
      } catch (err) {
        console.error(`Failed to copy ${type}:`, err);
        setEvaluationStatus(`Error copying ${type}`); // Show error in footer
      }
    },
    [],
  );

  const copyAllVisiblePaths = useCallback(async () => {
    const paths = filteredNodes
      .map((node) => node.path)
      .filter((path) => path !== ""); // Exclude root path
    if (paths.length === 0) {
      setEvaluationStatus("No paths to copy");
      return;
    }

    const pathsText = paths.join("\n");
    try {
      await navigator.clipboard.writeText(pathsText);
      setEvaluationStatus(
        `Copied ${paths.length} path${paths.length !== 1 ? "s" : ""} to clipboard`,
      );
    } catch (err) {
      console.error("Failed to copy paths:", err);
      setEvaluationStatus("Error copying paths");
    }
  }, [filteredNodes]);

  const handleOpenInNewTab = useCallback(
    (value: any, path: string) => {
      setOpenedItemId(path);

      // Determine pane side via ancestor data attribute
      const paneElem = containerRef.current?.closest("[data-editor-pane-side]");
      const sideAttr = paneElem?.getAttribute("data-editor-pane-side");
      const isRightSideLocal = splitView?.isSplit && sideAttr === "right";

      let content: string;
      if (typeof value === "object" && value !== null) {
        content = JSON.stringify(value, null, 2);
      } else {
        content = String(value);
      }

      const newTabId = crypto.randomUUID();
      const language = detectLanguage(content);
      const title = path ? `JSON: ${path}` : "JSON Value";

      addBackgroundTab(
        {
          id: newTabId,
          title,
          content,
          language,
          languageLocked: language !== "plaintext",
          cursorPosition: { lineNumber: 1, column: 1 },
          dateCreated: Date.now(),
          lastModified: Date.now(),
          workspaceId: activeWorkspaceId || "",
        },
        isRightSideLocal,
      );

      setTimeout(() => setOpenedItemId(null), 1500);
    },
    [addBackgroundTab, splitView.isSplit, activeWorkspaceId],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Evaluation/filtering is now handled by the useEffect watching debouncedInputValue
    if (searchMode === "path") {
      setEvaluationStatus("Evaluating..."); // Provide feedback while typing/debouncing
    } else {
      setEvaluationStatus(null); // Clear status in key/value mode
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as SearchMode;
    setSearchMode(newMode);
    setInputValue(""); // Clear input when changing mode
    setEvaluationStatus(null);
    setSelectedPath("");
    setLastValidEvaluatedPath(null); // Clear evaluated path state
  };

  // --- Rendering ---

  const NodeRenderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const node = filteredNodes[index];
      if (!node) return <div style={style}></div>;
      const indent = (node.depth - 1) * 16;
      const isSelected = selectedPath === node.path;
      let valueDisplay: React.ReactNode;
      const valueStringForCopy: any = node.value; // Use raw value for copy

      switch (node.type) {
        case "string":
          valueDisplay = <span className="text-green-400">"{node.value}"</span>;
          break;
        case "number":
          valueDisplay = <span className="text-yellow-400">{node.value}</span>;
          break;
        case "boolean":
          valueDisplay = (
            <span className="text-purple-400">{String(node.value)}</span>
          );
          break;
        case "null":
          valueDisplay = <span className="text-gray-500 italic">null</span>;
          break;
        case "object":
          valueDisplay = (
            <span className="text-gray-400">{`{...} (${node.childCount ?? 0})`}</span>
          );
          break;
        case "array":
          valueDisplay = (
            <span className="text-gray-400">{`[...] (${node.childCount ?? 0})`}</span>
          );
          break;
        default:
          valueDisplay = <span className="text-red-500">Unknown</span>;
      }
      const displayKey = node.key;

      return (
        <div
          style={{ ...style, paddingLeft: `${indent}px` }}
          className={`flex items-center py-0.5 px-2 group cursor-pointer ${isSelected ? "bg-blue-900/30" : "hover:bg-gray-800/60"}`}
          onClick={() => setSelectedPath(node.path)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleNode(node.path);
          }}
        >
          <div style={{ width: `${indent}px`, flexShrink: 0 }}></div>
          <div className="w-5 flex-shrink-0 flex items-center justify-center">
            {node.isExpandable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.path);
                }}
                className="text-gray-500 hover:text-gray-300"
                aria-label={node.isExpanded ? "Collapse" : "Expand"}
              >
                {node.isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : null}
          </div>
          <span
            className="text-blue-400 mr-1 whitespace-nowrap"
            title={String(displayKey)}
          >
            {typeof displayKey === "string" ? `"${displayKey}"` : displayKey}:
          </span>
          <span
            className="ml-1 truncate"
            title={typeof node.value === "string" ? node.value : undefined}
          >
            {valueDisplay}
          </span>
          <div
            className={`ml-auto flex items-center space-x-1 pl-2 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(node.path, "path");
              }}
              className="p-0.5 text-gray-500 hover:text-sky-400 hover:bg-gray-700/50 rounded"
              title={`Copy Path: ${node.path}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(valueStringForCopy, "value");
              }}
              className="p-0.5 text-gray-500 hover:text-green-400 hover:bg-gray-700/50 rounded"
              title="Copy Value"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInNewTab(valueStringForCopy, node.path);
              }}
              className={`p-0.5 rounded transition-colors ${openedItemId === node.path ? "text-green-400" : "text-gray-500 hover:text-blue-400 hover:bg-gray-700/50"}`}
              title="Open in New Tab"
            >
              {openedItemId === node.path ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <ExternalLink size={14} />
              )}
            </button>
          </div>
        </div>
      );
    },
    [
      filteredNodes,
      selectedPath,
      toggleNode,
      copyToClipboard,
      handleOpenInNewTab,
      openedItemId,
    ],
  ); // Keep dependencies minimal

  if (parseError) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-gray-200 p-4">
        <h3 className="text-red-500 font-semibold mb-2">Error Parsing JSON</h3>
        <pre className="text-red-400 text-sm bg-red-900/20 p-2 rounded overflow-auto custom-scrollbar">
          {parseError}
        </pre>
      </div>
    );
  }

  if (!rootNodeData) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-gray-400 p-4 items-center justify-center">
        Empty or invalid JSON data
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-gray-900 text-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex-none flex items-center p-2 border-b border-gray-700/50 gap-2 flex-wrap">
        {/* Mode Selector */}
        <div className="flex-shrink-0">
          <select
            value={searchMode}
            onChange={handleModeChange}
            className="bg-gray-700/80 border border-gray-600/80 text-gray-200 pl-2 pr-7 py-1 rounded focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50 text-sm appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.5rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.2em 1.2em",
            }}
            aria-label="Search Mode"
          >
            <option value="keyValue">Search Key/Value</option>
            <option value="path">Evaluate Path</option>
          </select>
        </div>

        {/* Combined Input */}
        <div className="flex-1 min-w-[200px] flex items-center relative">
          {searchMode === "keyValue" ? (
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
              pointerEvents="none"
            />
          ) : (
            <Route
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
              pointerEvents="none"
            />
          )}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            // onKeyDown removed - using debounce now
            placeholder={
              searchMode === "keyValue"
                ? "Search keys/values..."
                : "Evaluate path (e.g., users[0].name)"
            }
            className="bg-gray-800/50 border border-gray-700/50 text-gray-200 pl-8 pr-2 py-1 rounded focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50 w-full text-sm"
            aria-label={
              searchMode === "keyValue"
                ? "Search JSON Tree"
                : "Evaluate JSON Path"
            }
          />
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => toggleAllNodes(true)}
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded"
            title="Expand All"
          >
            <ChevronsDown size={16} />
          </button>
          <button
            onClick={() => toggleAllNodes(false)}
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded"
            title="Collapse All"
          >
            <ChevronsUp size={16} />
          </button>
          <button
            onClick={copyAllVisiblePaths}
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded"
            title="Copy All Visible Paths"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Tree View Area */}
      <div className="flex-1 overflow-hidden bg-gray-900/80">
        <List
          className="custom-scrollbar"
          ref={listRef}
          height={500}
          itemCount={filteredNodes.length}
          itemSize={26}
          width="100%"
          itemKey={(index) => filteredNodes[index]?.path ?? index}
        >
          {NodeRenderer}
        </List>
      </div>

      {/* Footer: Status or Selected Path */}
      <div className="flex-none p-1.5 border-t border-gray-700/50 text-gray-400 text-xs bg-gray-800/50 truncate flex items-center justify-between min-h-[28px]">
        {/* Display evaluation status/error OR selected path */}
        <span
          className={`truncate ${evaluationStatus && (evaluationStatus.startsWith("Error") || evaluationStatus.startsWith("Path segment") || evaluationStatus.startsWith("Cannot access") || evaluationStatus.includes("not found")) ? "text-red-400" : evaluationStatus ? "text-green-400" : ""}`}
        >
          {evaluationStatus || (
            <>
              <span className="font-semibold">Selected Path:</span>{" "}
              {selectedPath || "none"}
            </>
          )}
        </span>
        {/* Show copy button only when a path is selected and no error is shown */}
        {selectedPath && !evaluationStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(selectedPath, "path");
            }}
            className="ml-2 p-0.5 text-gray-500 hover:text-sky-400 hover:bg-gray-700/50 rounded inline-flex align-middle flex-shrink-0"
            title={`Copy Path: ${selectedPath}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default JsonTreeView;
