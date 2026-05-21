import React, { useEffect, useRef, useState } from "react";
import { useClickOutside } from "../../../hooks/useClickOutside";
import { InputFormat } from "../types";
import {
  Upload,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Grid,
  FileDown,
  Copy,
  ChevronDown,
  Check,
  HelpCircle,
  Replace,
} from "../../../components/Icons";

interface ToolbarProps {
  inputFormat: InputFormat;
  onChangeInputFormat: (format: InputFormat) => void;
  onUploadClick: () => void;
  onClear: () => void;

  // Grid config
  bytesPerRow: number;
  onChangeBytesPerRow: (val: number) => void;
  pageSize: number;
  onChangePageSize: (val: number) => void;

  // Pagination & jump-to-offset
  currentPage: number;
  totalPages: number;
  totalBytes: number;
  onChangePage: (page: number) => void;
  onJumpToOffset: (offset: number) => void;

  // Search & Replace
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  searchType: "hex" | "text";
  onChangeSearchType: (type: "hex" | "text") => void;
  searchMatchesCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  replaceQuery: string;
  onChangeReplaceQuery: (q: string) => void;
  onReplaceAll: () => void;

  // Exports
  onExport: (format: "hex-space" | "hex-raw" | "base64" | "c-array" | "json-array" | "bin" | "python-bytes" | "js-escaped") => void;
  hasData: boolean;

  // Undo / redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Keyboard shortcuts
  onShowShortcuts: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  inputFormat,
  onChangeInputFormat,
  onUploadClick,
  onClear,
  bytesPerRow,
  onChangeBytesPerRow,
  pageSize,
  onChangePageSize,
  currentPage,
  totalPages,
  totalBytes,
  onChangePage,
  onJumpToOffset,
  searchQuery,
  onChangeSearchQuery,
  searchType,
  onChangeSearchType,
  searchMatchesCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  replaceQuery,
  onChangeReplaceQuery,
  onReplaceAll,
  onExport,
  hasData,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onShowShortcuts,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [showReplace, setShowReplace] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(menuRef, () => setShowExportMenu(false));

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  const startOffset = currentPage * pageSize;
  const endOffset = Math.min(totalBytes, startOffset + pageSize) - 1;

  const handleExportSelect = (format: Parameters<typeof onExport>[0]) => {
    onExport(format);
    setShowExportMenu(false);
    if (format !== "bin") {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopiedFormat(format);
      copiedTimerRef.current = setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = jumpInput.trim().replace(/^0x/i, "");
    const offset = parseInt(raw, raw.match(/^[0-9a-fA-F]+$/) && jumpInput.trim().toLowerCase().startsWith("0x") ? 16 : 10);
    if (!isNaN(offset) && offset >= 0 && offset < totalBytes) {
      onJumpToOffset(offset);
      setJumpInput("");
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-base bg-surface-secondary px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left controls */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        {/* Input format selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold text-secondary">Input:</span>
          <select
            value={inputFormat}
            onChange={(e) => onChangeInputFormat(e.target.value as InputFormat)}
            className="px-2.5 py-1 text-xs font-medium bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main cursor-pointer"
          >
            <option value="hex">Hex String</option>
            <option value="base64">Base64</option>
            <option value="raw">Raw Text (UTF-8)</option>
            <option value="file">Local File</option>
          </select>
        </div>

        {inputFormat === "file" && (
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/95 text-white border border-transparent rounded shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <Upload size={12} />
            <span>Upload File</span>
          </button>
        )}

        {/* Layout config */}
        <div className="flex items-center space-x-1.5 border-l border-base pl-3">
          <Grid size={12} className="text-secondary" />
          <select
            value={bytesPerRow}
            onChange={(e) => onChangeBytesPerRow(parseInt(e.target.value))}
            className="px-2 py-1 text-[11px] font-medium bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main cursor-pointer"
            title="Columns layout"
          >
            <option value={8}>8 Columns</option>
            <option value={16}>16 Columns</option>
            <option value={24}>24 Columns</option>
            <option value={32}>32 Columns</option>
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <Settings size={12} className="text-secondary" />
          <select
            value={pageSize}
            onChange={(e) => onChangePageSize(parseInt(e.target.value))}
            className="px-2 py-1 text-[11px] font-medium bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main cursor-pointer"
            title="Page Size"
          >
            <option value={256}>256 Bytes / Page</option>
            <option value={512}>512 Bytes / Page</option>
            <option value={1024}>1024 Bytes / Page</option>
            <option value={2048}>2048 Bytes / Page</option>
          </select>
        </div>

        {/* Undo / Redo */}
        {hasData && (
          <div className="flex items-center gap-1 border-l border-base pl-3">
            <button
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="px-1.5 py-0.5 text-[10px] font-semibold text-secondary hover:text-main hover:bg-element-hover rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              ↩ Undo
            </button>
            <button
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              className="px-1.5 py-0.5 text-[10px] font-semibold text-secondary hover:text-main hover:bg-element-hover rounded disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              ↪ Redo
            </button>
          </div>
        )}

        {hasData && (
          <button
            onClick={onClear}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-subtle-bg/30 border border-transparent rounded transition-colors"
            title="Clear data"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Centre controls: pagination + jump-to-offset */}
      {hasData && (
        <div className="flex items-center gap-2 flex-wrap">
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 bg-canvas border border-base rounded px-2.5 py-1 text-xs text-secondary shadow-sm">
              <button
                disabled={currentPage === 0}
                onClick={() => onChangePage(currentPage - 1)}
                className="p-0.5 rounded hover:bg-element-hover active:scale-[0.9] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-main"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-mono text-[11px] font-medium px-1.5">
                Page {currentPage + 1}/{totalPages} ({startOffset.toLocaleString()}–{endOffset.toLocaleString()})
              </span>
              <button
                disabled={currentPage === totalPages - 1}
                onClick={() => onChangePage(currentPage + 1)}
                className="p-0.5 rounded hover:bg-element-hover active:scale-[0.9] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-main"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Jump-to-offset */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="0x… or dec"
              title="Jump to offset (hex e.g. 0x1A00 or decimal)"
              className="w-28 px-2 py-1 text-[11px] font-mono bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main placeholder-muted"
            />
            <button
              type="submit"
              className="px-2 py-1 text-[10px] font-semibold bg-canvas border border-base rounded hover:bg-element-hover text-main transition-colors"
              title="Jump to offset"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {/* Right controls: search, replace, export, shortcuts */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        {hasData && (
          <div className="flex flex-col gap-1">
            {/* Search row */}
            <div className="flex items-center bg-canvas border border-base rounded shadow-sm focus-within:ring-1 focus-within:ring-focus focus-within:border-transparent transition-all pr-1">
              <button
                onClick={() => onChangeSearchType(searchType === "hex" ? "text" : "hex")}
                className="px-2 py-1 text-[9px] font-bold text-primary uppercase border-r border-base hover:bg-element-hover rounded-l"
                title={`Toggle search mode — current: ${searchType.toUpperCase()}`}
              >
                {searchType}
              </button>
              <div className="relative flex items-center">
                <Search size={12} className="absolute left-2 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onChangeSearchQuery(e.target.value)}
                  placeholder={searchType === "hex" ? "Hex bytes (e.g. 48 65)" : "ASCII string…"}
                  className="pl-[22px] pr-2.5 py-1 text-xs w-[160px] bg-canvas border-none outline-none focus:ring-0 text-main placeholder-muted"
                />
              </div>
              {searchQuery && (
                <div className="flex items-center space-x-1 pl-1.5 border-l border-base text-[10px] font-semibold text-secondary">
                  <span className="pr-1 text-[9px] text-muted">
                    {searchMatchesCount > 0 ? `${currentMatchIndex + 1}/${searchMatchesCount}` : "0/0"}
                  </span>
                  <button disabled={searchMatchesCount === 0} onClick={onPrevMatch} className="p-0.5 rounded hover:bg-element-hover disabled:opacity-20 text-main">
                    <ChevronLeft size={10} />
                  </button>
                  <button disabled={searchMatchesCount === 0} onClick={onNextMatch} className="p-0.5 rounded hover:bg-element-hover disabled:opacity-20 text-main">
                    <ChevronRight size={10} />
                  </button>
                </div>
              )}
              {/* Toggle replace */}
              <button
                onClick={() => setShowReplace((v) => !v)}
                title="Toggle find & replace"
                className={`ml-1 p-1 rounded transition-colors ${showReplace ? "text-primary bg-primary-subtle-bg/20" : "text-muted hover:text-secondary"}`}
              >
                <Replace size={10} />
              </button>
            </div>

            {/* Replace row (shown when toggled) */}
            {showReplace && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => onChangeReplaceQuery(e.target.value)}
                  placeholder={searchType === "hex" ? "Replace hex…" : "Replace text…"}
                  className="flex-1 px-2 py-1 text-xs font-mono bg-canvas border border-base rounded focus:outline-none focus:ring-1 focus:ring-focus text-main placeholder-muted"
                />
                <button
                  onClick={onReplaceAll}
                  disabled={!searchQuery || searchMatchesCount === 0}
                  className="px-2 py-1 text-[10px] font-semibold bg-warning/20 border border-warning/30 text-warning-subtle-text rounded hover:bg-warning/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Replace all occurrences"
                >
                  Replace All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Exports Dropdown */}
        {hasData && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-canvas border border-base rounded hover:border-gray-500 hover:bg-element-hover text-main shadow-sm active:scale-[0.98] transition-all"
            >
              <FileDown size={12} />
              <span>Export</span>
              <ChevronDown size={12} className="text-secondary" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-surface-raised border border-base rounded-md shadow-lg z-50 py-1 divide-y divide-base/50">
                <div className="py-0.5">
                  {(["hex-space", "hex-raw", "base64"] as const).map((fmt) => {
                    const labels: Record<string, string> = { "hex-space": "Hex (spaced)", "hex-raw": "Hex (unspaced)", "base64": "Base64" };
                    return (
                      <button key={fmt} onClick={() => handleExportSelect(fmt)} className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between">
                        <span>Copy {labels[fmt]}</span>
                        {copiedFormat === fmt ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                      </button>
                    );
                  })}
                </div>
                <div className="py-0.5">
                  {(["c-array", "json-array"] as const).map((fmt) => {
                    const labels: Record<string, string> = { "c-array": "C Array", "json-array": "JSON Array" };
                    return (
                      <button key={fmt} onClick={() => handleExportSelect(fmt)} className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between">
                        <span>Copy as {labels[fmt]}</span>
                        {copiedFormat === fmt ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                      </button>
                    );
                  })}
                </div>
                <div className="py-0.5">
                  <button onClick={() => handleExportSelect("python-bytes")} className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between">
                    <span>Python bytes literal</span>
                    {copiedFormat === "python-bytes" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                  <button onClick={() => handleExportSelect("js-escaped")} className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between">
                    <span>C/JS hex-escaped string</span>
                    {copiedFormat === "js-escaped" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                </div>
                <div className="py-0.5">
                  <button onClick={() => handleExportSelect("bin")} className="w-full text-left px-3 py-2 text-xs text-primary font-semibold hover:bg-primary-subtle-bg/10 flex items-center justify-between">
                    <span>Download (.bin)</span>
                    <Download size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keyboard shortcuts */}
        <button
          onClick={onShowShortcuts}
          title="Keyboard shortcuts (?)"
          className="p-1.5 rounded border border-base bg-canvas text-secondary hover:text-main hover:bg-element-hover transition-colors"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
};
