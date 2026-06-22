import React, { useRef } from "react";
import { Search, X, Upload, ChevronDown } from "../../../components/Icons";
import {
  FilenameEncoding,
  SearchScope,
  SortBy,
  SortDir,
  ViewMode,
  ArchiveStats,
} from "../types";

interface ToolbarProps {
  fileName: string | null;
  fileSizeBytes: number | null;
  stats: ArchiveStats | null;
  inputMethod: "file" | "base64";
  base64Input: string;
  filenameEncoding: FilenameEncoding;
  searchQuery: string;
  searchScope: SearchScope;
  sortBy: SortBy;
  sortDir: SortDir;
  viewMode: ViewMode;
  showDotFiles: boolean;
  filterExtensions: string[];
  garbledFilenamesWarning: boolean;
  onFileSelect: (file: File) => void;
  onBase64Submit: (input: string) => void;
  onInputMethodChange: (method: "file" | "base64") => void;
  onBase64Change: (v: string) => void;
  onEncodingChange: (enc: FilenameEncoding) => void;
  onSearchQueryChange: (q: string) => void;
  onSearchScopeChange: (scope: SearchScope) => void;
  onSortByChange: (sort: SortBy) => void;
  onSortDirToggle: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onShowDotFilesChange: (v: boolean) => void;
  onRemoveFilterExtension: (ext: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  fileName,
  fileSizeBytes,
  stats,
  inputMethod,
  base64Input,
  filenameEncoding,
  searchQuery,
  searchScope,
  sortBy,
  sortDir,
  viewMode,
  showDotFiles,
  filterExtensions,
  garbledFilenamesWarning,
  onFileSelect,
  onBase64Submit,
  onInputMethodChange,
  onBase64Change,
  onEncodingChange,
  onSearchQueryChange,
  onSearchScopeChange,
  onSortByChange,
  onSortDirToggle,
  onViewModeChange,
  onShowDotFilesChange,
  onRemoveFilterExtension,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileSummary =
    fileName && fileSizeBytes != null
      ? `${fileName} (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB${stats ? `, ${stats.fileCount} files` : ""})`
      : null;

  return (
    <div className="flex-none border-b border-base bg-surface-secondary">
      {garbledFilenamesWarning && (
        <div className="px-3 py-1.5 text-xs text-warning bg-warning-subtle border-b border-warning/30">
          Filenames may be garbled. Try a different encoding.
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
        {/* Input method tabs */}
        <div className="flex border border-base rounded overflow-hidden text-xs">
          <button
            className={`px-2.5 py-1 ${inputMethod === "file" ? "bg-primary text-primary-content" : "text-secondary hover:text-main hover:bg-surface-raised"}`}
            onClick={() => onInputMethodChange("file")}
          >
            File
          </button>
          <button
            className={`px-2.5 py-1 ${inputMethod === "base64" ? "bg-primary text-primary-content" : "text-secondary hover:text-main hover:bg-surface-raised"}`}
            onClick={() => onInputMethodChange("base64")}
          >
            Base64
          </button>
        </div>

        {inputMethod === "file" && (
          <>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-base text-xs text-secondary hover:text-main hover:bg-surface-raised transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} />
              {fileName ? "Replace" : "Open File"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }}
            />
          </>
        )}

        {fileSummary && (
          <span className="text-xs text-secondary truncate max-w-xs">{fileSummary}</span>
        )}

        <div className="flex-1" />

        {/* Encoding */}
        <label className="text-xs text-muted">Encoding:</label>
        <div className="relative">
          <select
            value={filenameEncoding}
            onChange={(e) => onEncodingChange(e.target.value as FilenameEncoding)}
            className="text-xs bg-surface-raised border border-base rounded px-2 py-1 text-secondary appearance-none pr-5 cursor-pointer"
          >
            <option value="utf-8">UTF-8</option>
            <option value="cp437">CP437</option>
            <option value="shift-jis">Shift-JIS</option>
            <option value="windows-1252">Windows-1252</option>
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
      </div>

      {/* Base64 input area */}
      {inputMethod === "base64" && (
        <div className="px-3 pb-2 flex gap-2">
          <textarea
            value={base64Input}
            onChange={(e) => onBase64Change(e.target.value)}
            placeholder="Paste base64-encoded archive..."
            rows={3}
            className="flex-1 text-xs font-mono bg-canvas border border-base rounded px-2 py-1.5 text-main resize-none custom-scrollbar focus:outline-none focus:ring-1 focus:ring-focus"
          />
          <button
            onClick={() => onBase64Submit(base64Input)}
            disabled={!base64Input.trim()}
            className="px-3 py-1.5 rounded bg-primary text-primary-content text-xs disabled:opacity-50 hover:bg-primary/90 transition-colors self-start"
          >
            Parse
          </button>
        </div>
      )}

      {/* Search + view controls (only when archive is loaded) */}
      {stats && (
        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
          {/* Search bar */}
          <div className="flex items-center border border-base rounded overflow-hidden bg-canvas">
            <Search size={12} className="ml-2 text-muted flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search…"
              className="text-xs px-2 py-1 bg-transparent text-main focus:outline-none w-36"
            />
            {searchQuery && (
              <button onClick={() => onSearchQueryChange("")} className="mr-1 text-muted hover:text-main">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Scope */}
          <select
            value={searchScope}
            onChange={(e) => onSearchScopeChange(e.target.value as SearchScope)}
            className="text-xs bg-surface-raised border border-base rounded px-2 py-1 text-secondary"
          >
            <option value="name">Name</option>
            <option value="path">Path</option>
            <option value="content">Content</option>
          </select>

          <div className="flex-1" />

          {/* View mode */}
          <div className="flex border border-base rounded overflow-hidden text-xs">
            <button
              className={`px-2.5 py-1 ${viewMode === "tree" ? "bg-primary/10 text-primary" : "text-secondary hover:text-main"}`}
              onClick={() => onViewModeChange("tree")}
            >
              Tree
            </button>
            <button
              className={`px-2.5 py-1 ${viewMode === "flat" ? "bg-primary/10 text-primary" : "text-secondary hover:text-main"}`}
              onClick={() => onViewModeChange("flat")}
            >
              Flat
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="text-xs bg-surface-raised border border-base rounded px-2 py-1 text-secondary"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="compressedSize">Compressed</option>
            <option value="modified">Modified</option>
          </select>
          <button
            onClick={onSortDirToggle}
            className="text-xs px-2 py-1 border border-base rounded text-secondary hover:text-main"
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>

          {/* Dotfiles */}
          <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showDotFiles}
              onChange={(e) => onShowDotFilesChange(e.target.checked)}
              className="accent-primary"
            />
            Dotfiles
          </label>

          {/* Extension filter chips */}
          {filterExtensions.map((ext) => (
            <span
              key={ext}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
            >
              .{ext}
              <button onClick={() => onRemoveFilterExtension(ext)} className="hover:text-danger">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
