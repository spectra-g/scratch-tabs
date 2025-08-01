import React from 'react';
import {
  GitCompare,
  List,
  EyeOff,
  Eye,
  Copy,
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
  const summary = getDiffSummary(parsedDiff);

  return (
    <div className="flex-none border-b border-gray-700 p-3 bg-gray-800/50">
      {/* Top row: Main controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('side-by-side')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
              title="Side-by-side view"
            >
              <GitCompare size={14} />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => onViewModeChange('unified')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'unified'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
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
            className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              hideWhitespaceChanges
                ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={fileFilter}
              onChange={(e) => onFileFilterChange(e.target.value)}
              placeholder="Filter files..."
              className="pl-10 pr-8 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
            />
            {fileFilter && (
              <button
                onClick={() => onFileFilterChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={onCopyDiff}
          className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-sm transition-colors"
          title="Copy filtered diff"
        >
          <Copy size={14} />
          <span>Copy Diff</span>
        </button>
      </div>

      {/* Bottom row: Statistics */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FileText size={14} />
            <span>
              {filteredFiles.length} of {summary.totalFiles} files
            </span>
          </div>
          
          {summary.newFiles > 0 && (
            <div className="flex items-center space-x-1 text-green-400">
              <Plus size={14} />
              <span>{summary.newFiles} added</span>
            </div>
          )}
          
          {summary.deletedFiles > 0 && (
            <div className="flex items-center space-x-1 text-red-400">
              <Minus size={14} />
              <span>{summary.deletedFiles} deleted</span>
            </div>
          )}
          
          {summary.modifiedFiles > 0 && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <RotateCcw size={14} />
              <span>{summary.modifiedFiles} modified</span>
            </div>
          )}
          
          {summary.renamedFiles > 0 && (
            <div className="flex items-center space-x-1 text-blue-400">
              <RotateCcw size={14} />
              <span>{summary.renamedFiles} renamed</span>
            </div>
          )}
        </div>

        {/* Change statistics */}
        <div className="flex items-center space-x-4">
          <span className="text-green-400">
            +{summary.totalAdditions.toLocaleString()}
          </span>
          <span className="text-red-400">
            -{summary.totalDeletions.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};