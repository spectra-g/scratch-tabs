import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  List,
  EyeOff,
  Eye,
  Copy,
  Check,
  Search,
  X,
  FileText,
  Plus,
  Minus,
  RotateCcw
} from '../../../../components/Icons';
import { ViewMode } from './DiffViewer';
import { ParsedDiff, FileDiff, getDiffSummary } from '../../utils/parser';

interface DiffToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hideWhitespaceChanges: boolean;
  onToggleWhitespaceChanges: (hide: boolean) => void;
  fileFilter: string;
  onFileFilterChange: (filter: string) => void;
  onCopyDiff: () => void;
  parsedDiff: ParsedDiff;
  filteredFiles: FileDiff[];
}

export const DiffToolbar: React.FC<DiffToolbarProps> = ({
  viewMode,
  onViewModeChange,
  hideWhitespaceChanges,
  onToggleWhitespaceChanges,
  fileFilter,
  onFileFilterChange,
  onCopyDiff,
  parsedDiff,
  filteredFiles,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const summary = getDiffSummary(parsedDiff);

  const handleCopyDiff = async () => {
    await onCopyDiff();
    setIsCopied(true);
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
      {/* Top row: Main controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* View mode toggle */}
          <div className="flex items-center bg-element rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('side-by-side')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'side-by-side'
                ? 'bg-primary text-white'
                : 'text-main hover:text-white hover:bg-element-hover'
                }`}
              title="Side-by-side view"
            >
              <GitCompare size={14} />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => onViewModeChange('unified')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'unified'
                ? 'bg-primary text-white'
                : 'text-main hover:text-white hover:bg-element-hover'
                }`}
              title="Unified view"
            >
              <List size={14} />
              <span>Unified</span>
            </button>
          </div>

          {/* Whitespace toggle */}
          <button
            onClick={() => onToggleWhitespaceChanges(!hideWhitespaceChanges)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${hideWhitespaceChanges
              ? 'bg-warning/20 text-warning hover:bg-warning/30'
              : 'bg-element text-main hover:bg-element-hover'
              }`}
            title={hideWhitespaceChanges ? 'Show whitespace changes' : 'Hide whitespace changes'}
          >
            {hideWhitespaceChanges ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>
              {hideWhitespaceChanges ? 'Show' : 'Hide'} Whitespace
            </span>
          </button>

          {/* File filter */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={fileFilter}
              onChange={(e) => onFileFilterChange(e.target.value)}
              placeholder="Filter files..."
              className="pl-10 pr-8 py-1.5 bg-element border border-base rounded text-sm text-main placeholder-secondary focus:outline-none focus:border-focus w-64"
            />
            {fileFilter && (
              <button
                onClick={() => onFileFilterChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyDiff}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors ${isCopied
            ? "bg-success/20 text-success"
            : "bg-element text-main hover:bg-element-hover"
            }`}
          title={isCopied ? "Copied!" : "Copy filtered diff"}
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          <span>{isCopied ? 'Copied!' : 'Copy Diff'}</span>
        </button>
      </div>

      {/* Bottom row: Statistics */}
      <div className="flex items-center justify-between text-sm text-secondary">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FileText size={14} />
            <span>
              {filteredFiles.length} of {summary.totalFiles} files
            </span>
          </div>

          {summary.newFiles > 0 && (
            <div className="flex items-center space-x-1 text-success">
              <Plus size={14} />
              <span>{summary.newFiles} added</span>
            </div>
          )}

          {summary.deletedFiles > 0 && (
            <div className="flex items-center space-x-1 text-danger">
              <Minus size={14} />
              <span>{summary.deletedFiles} deleted</span>
            </div>
          )}

          {summary.modifiedFiles > 0 && (
            <div className="flex items-center space-x-1 text-warning">
              <RotateCcw size={14} />
              <span>{summary.modifiedFiles} modified</span>
            </div>
          )}

          {summary.renamedFiles > 0 && (
            <div className="flex items-center space-x-1 text-info">
              <RotateCcw size={14} />
              <span>{summary.renamedFiles} renamed</span>
            </div>
          )}
        </div>

        {/* Change statistics */}
        <div className="flex items-center space-x-4">
          <span className="text-success">
            +{summary.totalAdditions.toLocaleString()}
          </span>
          <span className="text-danger">
            -{summary.totalDeletions.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};