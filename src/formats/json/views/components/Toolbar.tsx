import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  RotateCw,
  Wand2,
  Database,
  ChevronDown,
  Navigation,
  Search,
  Route,
} from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { applyEditToEditor } from "../../actions/jsonOperations";
import { autoFixJson, formatFixedJson } from "../../actions/jsonAutoFix";
import { useQueryPanelStore } from "../../stores/useQueryPanelStore";
import { buildTree, JsonNodeData } from "../../components/JsonTreeView/JsonTreeView";
import { useFieldSuggestions, FieldSuggestion } from "../../hooks/useFieldSuggestions";

interface ToolbarProps {
  isValid: boolean;
  validationError: string | null;
  currentPath: string;
  onPathChange: (path: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onContentChange: (content: string) => void;
  tabId: string;
  content: string;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
}

type SearchMode = "path" | "find";

export const Toolbar: React.FC<ToolbarProps> = ({
  isValid,
  validationError,
  currentPath,
  onPathChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  editor,
  onContentChange: _onContentChange,
  tabId,
  content,
  searchText,
  onSearchTextChange,
  onFindNext,
  onFindPrevious,
}) => {
  const { getStateForTab, togglePanel } = useQueryPanelStore();
  const { isOpen: isQueryPanelOpen } = getStateForTab(tabId);
  const [searchMode, setSearchMode] = useState<SearchMode>("path");
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);

  // Parsed once per content change; feeds the "go to path" suggestions below.
  const rootNodeData = useMemo<JsonNodeData | null>(() => {
    try {
      return buildTree("", JSON.parse(content), 0, "");
    } catch {
      return null;
    }
  }, [content]);

  const fieldSuggestions = useFieldSuggestions(
    searchMode === "path" ? rootNodeData : null,
    searchMode === "path" ? currentPath : "",
  );

  useEffect(() => {
    setHighlightedSuggestion(0);
  }, [fieldSuggestions]);

  useEffect(() => {
    if (searchMode !== "path" || !currentPath.trim() || fieldSuggestions.length === 0) {
      setSuggestionsOpen(false);
    }
  }, [searchMode, currentPath, fieldSuggestions.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsScopeDropdownOpen(false);
      }
    };

    if (isScopeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isScopeDropdownOpen]);

  const handleAutoFix = () => {
    if (!editor) return;

    const content = editor.getValue();
    const result = autoFixJson(content);

    if (result.success && result.fixedContent) {
      try {
        const formatted = formatFixedJson(result.fixedContent);
        applyEditToEditor(editor, formatted, "auto-fix");
      } catch (error) {
        console.error("Failed to format fixed JSON:", error);
        applyEditToEditor(editor, result.fixedContent, "auto-fix");
      }
    } else {
      console.warn("Auto-fix failed:", result.error);
    }
  };

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (searchMode === "path") {
        onPathChange(value);
        setSuggestionsOpen(!!value.trim());
      } else {
        onSearchTextChange(value);
      }
    },
    [searchMode, onPathChange, onSearchTextChange]
  );

  const handleSearchFocus = useCallback(() => {
    if (searchMode === "path" && currentPath.trim()) {
      setSuggestionsOpen(true);
    }
  }, [searchMode, currentPath]);

  // This box only ever evaluates a full path, so both "matching field" and
  // "suggested path" entries apply the same way: jump straight to the path.
  const applySuggestion = useCallback(
    (suggestion: FieldSuggestion) => {
      onPathChange(suggestion.path);
      setSuggestionsOpen(false);
    },
    [onPathChange],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (searchMode === "path" && suggestionsOpen && fieldSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedSuggestion((i) => (i + 1) % fieldSuggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedSuggestion((i) => (i - 1 + fieldSuggestions.length) % fieldSuggestions.length);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          applySuggestion(fieldSuggestions[highlightedSuggestion]);
          return;
        }
        if (e.key === "Escape") {
          setSuggestionsOpen(false);
          return;
        }
      }

      if (searchMode === "find" && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          onFindPrevious();
        } else {
          onFindNext();
        }
      }
    },
    [searchMode, suggestionsOpen, fieldSuggestions, highlightedSuggestion, applySuggestion, onFindNext, onFindPrevious]
  );

  const toggleSearchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setIsScopeDropdownOpen(false);
    setSuggestionsOpen(false);
  }, []);

  const currentSearchValue = searchMode === "path" ? currentPath : searchText;
  const placeholder =
    searchMode === "path"
      ? "Go to path (e.g., users[0].id)..."
      : "Find text...";

  return (
    <div className="flex items-center justify-between p-3 border-b border-base bg-surface-secondary">
      {/* Left Section: Validation Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {isValid ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <XCircle size={16} className="text-danger" />
          )}
          <span className="text-sm text-main">
            {isValid ? "Valid JSON" : "Invalid JSON"}
          </span>
          {validationError && (
            <>
              <span
                className="text-xs text-danger ml-2"
                title={validationError}
              >
                {validationError.length > 50
                  ? `${validationError.substring(0, 50)}...`
                  : validationError}
              </span>
              <button
                onClick={handleAutoFix}
                className="p-1 rounded hover:bg-element-hover text-info hover:text-main transition-colors"
                title="Auto-fix JSON"
              >
                <Wand2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Center Section: Search with Scope Toggle */}
      <div className="flex-1 max-w-lg mx-4">
        <div className="flex items-center bg-element border border-base rounded focus-within:border-focus relative">
          {/* Scope Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-main hover:bg-element-hover transition-colors border-r border-base"
              title="Search scope"
            >
              {searchMode === "path" ? (
                <Navigation size={14} />
              ) : (
                <Search size={14} />
              )}
              <span className="hidden sm:inline">
                {searchMode === "path" ? "Path" : "Find"}
              </span>
              <ChevronDown size={12} />
            </button>

            {isScopeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded shadow-lg z-50 min-w-[120px]">
                <button
                  onClick={() => toggleSearchMode("path")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-element-hover transition-colors ${
                    searchMode === "path" ? "text-info" : "text-main"
                  }`}
                >
                  <Navigation size={14} />
                  <span>Go to Path</span>
                </button>
                <button
                  onClick={() => toggleSearchMode("find")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-element-hover transition-colors ${
                    searchMode === "find" ? "text-info" : "text-main"
                  }`}
                >
                  <Search size={14} />
                  <span>Find Text</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={currentSearchValue}
            onChange={handleSearchInputChange}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-1 bg-transparent text-main text-sm placeholder:text-muted focus:outline-none"
            role={searchMode === "path" ? "combobox" : undefined}
            aria-expanded={searchMode === "path" ? suggestionsOpen && fieldSuggestions.length > 0 : undefined}
            aria-controls={searchMode === "path" ? "json-path-suggestions" : undefined}
            aria-autocomplete={searchMode === "path" ? "list" : undefined}
            aria-activedescendant={
              searchMode === "path" && suggestionsOpen && fieldSuggestions.length > 0
                ? `json-path-suggestion-${highlightedSuggestion}`
                : undefined
            }
          />

          {searchMode === "path" && suggestionsOpen && fieldSuggestions.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setSuggestionsOpen(false)}
              />
              <div
                id="json-path-suggestions"
                data-testid="json-path-suggestions"
                role="listbox"
                className="absolute top-full left-0 mt-1 w-full bg-surface border border-base rounded-lg shadow-xl z-40 max-h-64 overflow-auto text-xs"
              >
                {fieldSuggestions.some((s) => s.kind === "key") && (
                  <div className="px-2 pt-2 pb-1 text-secondary font-semibold uppercase tracking-wide text-[10px]">
                    Matching fields
                  </div>
                )}
                {fieldSuggestions.map((suggestion, index) => (
                  <React.Fragment key={`${suggestion.kind}-${suggestion.path}`}>
                    {suggestion.kind === "path" &&
                      (index === 0 || fieldSuggestions[index - 1].kind === "key") && (
                        <div className="px-2 pt-2 pb-1 text-secondary font-semibold uppercase tracking-wide text-[10px] border-t border-base">
                          Suggested paths
                        </div>
                      )}
                    <div
                      id={`json-path-suggestion-${index}`}
                      data-testid={`json-path-suggestion-${suggestion.kind}-${suggestion.path}`}
                      role="option"
                      aria-selected={index === highlightedSuggestion}
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep focus on input so blur doesn't beat the click
                        applySuggestion(suggestion);
                      }}
                      onMouseEnter={() => setHighlightedSuggestion(index)}
                      className={`px-2 py-1 cursor-pointer truncate flex items-center gap-1.5 ${
                        index === highlightedSuggestion
                          ? "bg-element-active text-info"
                          : "text-main hover:bg-element-hover"
                      }`}
                      title={suggestion.label}
                    >
                      {suggestion.kind === "path" && (
                        <Route size={12} className="flex-shrink-0 text-secondary" />
                      )}
                      <span className="truncate">{suggestion.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Section: Query Toggle & Undo/Redo */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => togglePanel(tabId)}
          className={`flex items-center space-x-1 px-3 py-1 rounded transition-colors ${
            isQueryPanelOpen
              ? "bg-primary/20 text-info"
              : "bg-element hover:bg-element-hover text-main"
          }`}
          title="Toggle JMESPath Query Panel"
        >
          <Database size={14} />
          <span className="text-sm">Query</span>
        </button>

        <div className="w-px h-6 bg-base mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded transition-colors ${
            canUndo
              ? "hover:bg-element-hover text-main"
              : "text-muted cursor-not-allowed"
          }`}
          title="Undo"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded transition-colors ${
            canRedo
              ? "hover:bg-element-hover text-main"
              : "text-muted cursor-not-allowed"
          }`}
          title="Redo"
        >
          <RotateCw size={16} />
        </button>
      </div>
    </div>
  );
};
