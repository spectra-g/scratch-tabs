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
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalBytes: number;
  onChangePage: (page: number) => void;
  
  // Search
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  searchType: "hex" | "text";
  onChangeSearchType: (type: "hex" | "text") => void;
  searchMatchesCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  
  // Exports
  onExport: (format: "hex-space" | "hex-raw" | "base64" | "c-array" | "json-array" | "bin") => void;
  hasData: boolean;
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
  searchQuery,
  onChangeSearchQuery,
  searchType,
  onChangeSearchType,
  searchMatchesCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onExport,
  hasData,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(menuRef, () => setShowExportMenu(false));

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  const startOffset = currentPage * pageSize;
  const endOffset = Math.min(totalBytes, startOffset + pageSize) - 1;

  const handleExportSelect = (format: "hex-space" | "hex-raw" | "base64" | "c-array" | "json-array" | "bin") => {
    onExport(format);
    setShowExportMenu(false);

    if (format !== "bin") {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopiedFormat(format);
      copiedTimerRef.current = setTimeout(() => setCopiedFormat(null), 1500);
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-base bg-surface-secondary px-4 py-3 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Left controls: Inputs & Config */}
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

        {/* Upload file triggers */}
        {inputFormat === "file" && (
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-primary hover:bg-primary/95 text-white border border-transparent rounded shadow-sm hover:shadow active:scale-[0.98] transition-all"
          >
            <Upload size={12} />
            <span>Upload File</span>
          </button>
        )}

        {/* Layout: Bytes Per Row selector */}
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

        {/* Page size configuration */}
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

        {/* Clear Action */}
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

      {/* Middle controls: Pagination */}
      {hasData && totalPages > 1 && (
        <div className="flex items-center space-x-2 bg-canvas border border-base rounded px-2.5 py-1 text-xs text-secondary shadow-sm">
          <button
            disabled={currentPage === 0}
            onClick={() => onChangePage(currentPage - 1)}
            className="p-0.5 rounded hover:bg-element-hover active:scale-[0.9] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-main"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[11px] font-medium px-1.5">
            Page {currentPage + 1} of {totalPages} (Offsets {startOffset.toLocaleString()} - {endOffset.toLocaleString()})
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

      {/* Right controls: Search & Export */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        {/* Search Widget */}
        {hasData && (
          <div className="flex items-center bg-canvas border border-base rounded shadow-sm focus-within:ring-1 focus-within:ring-focus focus-within:border-transparent transition-all pr-1">
            {/* Search Type button */}
            <button
              onClick={() => onChangeSearchType(searchType === "hex" ? "text" : "hex")}
              className="px-2 py-1 text-[9px] font-bold text-primary uppercase border-r border-base hover:bg-element-hover rounded-l"
              title={`Toggle Search mode. Current: ${searchType.toUpperCase()}`}
            >
              {searchType}
            </button>
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder={searchType === "hex" ? "Hex sequence (e.g. 48 65)" : "ASCII string..."}
                className="pl-6.5 pr-2.5 py-1 text-xs w-[180px] bg-transparent border-none outline-none focus:ring-0 text-main placeholder-muted"
              />
            </div>

            {/* Matches count & navigation */}
            {searchQuery && (
              <div className="flex items-center space-x-1 pl-1.5 border-l border-base text-[10px] font-semibold text-secondary">
                <span className="pr-1 text-[9px] text-muted">
                  {searchMatchesCount > 0 
                    ? `${currentMatchIndex + 1}/${searchMatchesCount}` 
                    : "0/0"}
                </span>
                <button
                  disabled={searchMatchesCount === 0}
                  onClick={onPrevMatch}
                  className="p-0.5 rounded hover:bg-element-hover disabled:opacity-20 text-main"
                >
                  <ChevronLeft size={10} />
                </button>
                <button
                  disabled={searchMatchesCount === 0}
                  onClick={onNextMatch}
                  className="p-0.5 rounded hover:bg-element-hover disabled:opacity-20 text-main"
                >
                  <ChevronRight size={10} />
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
              <div className="absolute right-0 mt-1 w-48 bg-surface-raised border border-base rounded-md shadow-lg z-50 py-1 divide-y divide-base/50">
                <div className="py-0.5">
                  <button
                    onClick={() => handleExportSelect("hex-space")}
                    className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between"
                  >
                    <span>Copy Hex (spaced)</span>
                    {copiedFormat === "hex-space" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                  <button
                    onClick={() => handleExportSelect("hex-raw")}
                    className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between"
                  >
                    <span>Copy Hex (unspaced)</span>
                    {copiedFormat === "hex-raw" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                  <button
                    onClick={() => handleExportSelect("base64")}
                    className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between"
                  >
                    <span>Copy Base64</span>
                    {copiedFormat === "base64" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                </div>
                <div className="py-0.5">
                  <button
                    onClick={() => handleExportSelect("c-array")}
                    className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between"
                  >
                    <span>Copy as C Array</span>
                    {copiedFormat === "c-array" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                  <button
                    onClick={() => handleExportSelect("json-array")}
                    className="w-full text-left px-3 py-2 text-xs text-main hover:bg-element-hover flex items-center justify-between"
                  >
                    <span>Copy as JSON Array</span>
                    {copiedFormat === "json-array" ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted/60" />}
                  </button>
                </div>
                <div className="py-0.5">
                  <button
                    onClick={() => handleExportSelect("bin")}
                    className="w-full text-left px-3 py-2 text-xs text-primary font-semibold hover:bg-primary-subtle-bg/10 flex items-center justify-between"
                  >
                    <span>Download (.bin)</span>
                    <Download size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
