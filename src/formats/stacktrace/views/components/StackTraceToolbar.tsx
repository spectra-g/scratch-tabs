import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  X,
  Filter,
  Bug,
  FileTerminal,
} from '../../../../components/Icons';

interface StackTraceToolbarProps {
  hideLibraryFrames: boolean;
  onToggleLibraryFrames: (hide: boolean) => void;
  searchFilter: string;
  onSearchFilterChange: (filter: string) => void;
  onCopyCleanedTrace: () => void;
  summary: {
    totalFrames: number;
    libraryFrames: number;
    userFrames: number;
    languages: string[];
  };
  language: string;
}

export const StackTraceToolbar: React.FC<StackTraceToolbarProps> = ({
  hideLibraryFrames,
  onToggleLibraryFrames,
  searchFilter,
  onSearchFilterChange,
  onCopyCleanedTrace,
  summary,
  language,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async () => {
    await onCopyCleanedTrace();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
      {/* Top row: Main controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* Language indicator */}
          <div className="flex items-center space-x-2">
            <FileTerminal size={16} className="text-main" />
            <span className="text-sm text-main capitalize">{language}</span>
          </div>

          {/* Library frames toggle */}
          <button
            onClick={() => onToggleLibraryFrames(!hideLibraryFrames)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors ${hideLibraryFrames
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'bg-element text-main hover:bg-element-hover'
              }`}
            title={hideLibraryFrames ? 'Show library frames' : 'Hide library frames'}
          >
            {hideLibraryFrames ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>
              {hideLibraryFrames ? 'Show' : 'Hide'} Library Frames
            </span>
          </button>

          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => onSearchFilterChange(e.target.value)}
              placeholder="Filter frames..."
              className="pl-10 pr-8 py-1.5 input-themed rounded text-sm w-64"
            />
            {searchFilter && (
              <button
                onClick={() => onSearchFilterChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-main hover:text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyClick}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors ${isCopied
            ? "bg-success/20 text-success"
            : "bg-element text-main hover:bg-element-hover"
            }`}
          title={isCopied ? "Copied!" : "Copy cleaned stack trace"}
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          <span>{isCopied ? "Copied!" : "Copy Cleaned Trace"}</span>
        </button>
      </div>

      {/* Bottom row: Statistics */}
      <div className="flex items-center justify-between text-sm text-main">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Bug size={14} />
            <span>
              {summary.totalFrames} total frames
            </span>
          </div>

          {summary.libraryFrames > 0 && (
            <div className="flex items-center space-x-1">
              <Filter size={14} />
              <span>
                {summary.libraryFrames} library, {summary.userFrames} user
              </span>
            </div>
          )}

          {summary.languages.length > 1 && (
            <div>
              <span>Languages: {summary.languages.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Filter status */}
        {(hideLibraryFrames || searchFilter) && (
          <div className="text-xs">
            {hideLibraryFrames && 'Library frames hidden'}
            {hideLibraryFrames && searchFilter && ' • '}
            {searchFilter && `Filtered by "${searchFilter}"`}
          </div>
        )}
      </div>
    </div>
  );
};