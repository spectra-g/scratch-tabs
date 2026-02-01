import React, { useState, useCallback, useRef, useEffect } from "react";
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
} from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { applyEditToEditor } from "../../actions/jsonOperations";
import { autoFixJson, formatFixedJson } from "../../actions/jsonAutoFix";
import { useQueryPanelStore } from "../../stores/useQueryPanelStore";

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
      } else {
        onSearchTextChange(value);
      }
    },
    [searchMode, onPathChange, onSearchTextChange]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (searchMode === "find") {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            onFindPrevious();
          } else {
            onFindNext();
          }
        }
      }
    },
    [searchMode, onFindNext, onFindPrevious]
  );

  const toggleSearchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setIsScopeDropdownOpen(false);
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
        <div className="flex items-center bg-element border border-base rounded focus-within:ring-2 focus-within:border-focus">
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
            onKeyDown={handleSearchKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-1 bg-transparent text-main text-sm placeholder:text-muted focus:outline-none"
          />
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
