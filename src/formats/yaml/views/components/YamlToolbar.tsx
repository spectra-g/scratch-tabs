import React from 'react';
import {
  Search,
  X,
  Hash,
  MessageSquare,
  FileText,
  CheckCircle,
  Braces,
  RotateCcw,
  RotateCw
} from '../../../../components/Icons';
import { YamlDocument, YamlNode } from '../../utils/yamlParser';

interface YamlToolbarProps {
  showComments: boolean;
  showPaths: boolean;
  searchQuery: string;
  onToggleComments: () => void;
  onTogglePaths: () => void;
  onSearchChange: (query: string) => void;
  documentCount: number;
  activeDocument: YamlDocument | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasError?: boolean;
}

export const YamlToolbar: React.FC<YamlToolbarProps> = ({
  showComments,
  showPaths,
  searchQuery,
  onToggleComments,
  onTogglePaths,
  onSearchChange,
  documentCount,
  activeDocument,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasError = false,
}) => {
  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
      <div className="flex items-center justify-between">
        {/* Left side: Search and view toggles */}
        <div className="flex items-center space-x-4">
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={hasError ? "Search unavailable" : "Search structure..."}
              disabled={hasError}
              className={`pl-10 pr-8 py-1.5 border rounded text-sm focus:outline-none w-64 ${hasError
                ? "bg-element border-base text-muted placeholder-muted cursor-not-allowed"
                : "bg-element border-base text-main placeholder-secondary focus:border-focus"
                }`}
            />
            {searchQuery && !hasError && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* View toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={hasError ? undefined : onToggleComments}
              disabled={hasError}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${hasError
                ? 'bg-element text-muted cursor-not-allowed'
                : showComments
                  ? 'bg-primary/20 text-info'
                  : 'bg-element text-secondary hover:bg-element-hover'
                }`}
              title={hasError ? 'Unavailable due to parse error' : showComments ? 'Hide comments' : 'Show comments'}
            >
              <MessageSquare size={12} />
              <span>Comments</span>
            </button>

            <button
              onClick={hasError ? undefined : onTogglePaths}
              disabled={hasError}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${hasError
                ? 'bg-element text-muted cursor-not-allowed'
                : showPaths
                  ? 'bg-primary/20 text-info'
                  : 'bg-element text-secondary hover:bg-element-hover'
                }`}
              title={hasError ? 'Unavailable due to parse error' : showPaths ? 'Hide paths' : 'Show paths'}
            >
              <Hash size={12} />
              <span>Paths</span>
            </button>
          </div>

          {/* Undo/Redo buttons */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${canUndo
                ? "hover:bg-element-hover text-main"
                : "text-muted cursor-not-allowed"
                }`}
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${canRedo
                ? "hover:bg-element-hover text-main"
                : "text-muted cursor-not-allowed"
                }`}
              title="Redo"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Right side: Document info and status */}
        <div className="flex items-center space-x-4 text-sm text-secondary">
          {/* Document count */}
          {documentCount > 1 && (
            <div className="flex items-center space-x-1">
              <FileText size={14} />
              <span>{documentCount} documents</span>
            </div>
          )}

          {/* Node count for active document */}
          {activeDocument && (
            <div className="flex items-center space-x-1">
              <Braces size={14} />
              <span>{countNodes(activeDocument.nodes)} nodes</span>
            </div>
          )}

          {/* Validation status */}
          <div className="flex items-center space-x-1">
            <CheckCircle size={14} className="text-success" />
            <span>Valid YAML</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to count total nodes
function countNodes(nodes: YamlNode[]): number {
  let count = nodes.length;
  nodes.forEach(node => {
    if (node.children) {
      count += countNodes(node.children);
    }
  });
  return count;
}