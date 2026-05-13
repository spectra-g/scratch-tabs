import React, { useState } from "react";
import {
  Search,
  X,
  Braces,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  RotateCw,
  ChevronDown,
  Code,
  FileText,
} from "../../../../components/Icons";

interface TomlToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  nodeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onConvertToJson: () => void;
  onConvertToYaml: () => void;
  hasError?: boolean;
}

export const TomlToolbar: React.FC<TomlToolbarProps> = ({
  searchQuery,
  onSearchChange,
  nodeCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onConvertToJson,
  onConvertToYaml,
  hasError = false,
}) => {
  const [showConvertMenu, setShowConvertMenu] = useState(false);

  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-main" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={hasError ? "Search unavailable" : "Search structure..."}
              disabled={hasError}
              className={`pl-10 pr-8 py-1.5 border rounded text-sm focus:outline-none w-64 ${
                hasError
                  ? "bg-element border-base text-muted placeholder-muted cursor-not-allowed"
                  : "bg-element border-base text-main placeholder-secondary focus:border-focus"
              }`}
            />
            {searchQuery && !hasError && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo ? "hover:bg-element-hover text-main" : "text-muted cursor-not-allowed"
              }`}
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo ? "hover:bg-element-hover text-main" : "text-muted cursor-not-allowed"
              }`}
              title="Redo"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <button
              onClick={() => setShowConvertMenu((v) => !v)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <Code size={14} />
              <span>Convert</span>
              <ChevronDown size={12} />
            </button>

            {showConvertMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowConvertMenu(false)} />
                <div className="absolute top-full right-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[180px]">
                  <div className="py-1">
                    <button
                      onClick={() => { onConvertToJson(); setShowConvertMenu(false); }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <Code size={14} className="text-info" />
                      <span>Convert to JSON</span>
                    </button>
                    <button
                      onClick={() => { onConvertToYaml(); setShowConvertMenu(false); }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <FileText size={14} className="text-primary" />
                      <span>Convert to YAML</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1 text-sm text-main">
            <Braces size={14} />
            <span>{nodeCount} nodes</span>
          </div>

          <div className="flex items-center space-x-1 text-sm">
            {hasError ? (
              <>
                <AlertCircle size={14} className="text-danger" />
                <span className="text-danger">Parse error</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} className="text-success" />
                <span className="text-success">Valid TOML</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
