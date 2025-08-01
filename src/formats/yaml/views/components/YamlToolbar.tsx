import React from 'react';
import { 
  Search, 
  X, 
  Eye, 
  EyeOff, 
  Hash, 
  MessageSquare,
  FileText,
  CheckCircle,
  AlertTriangle,
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
    <div className="flex-none border-b border-gray-700 p-3 bg-gray-800/50">
      <div className="flex items-center justify-between">
        {/* Left side: Search and view toggles */}
        <div className="flex items-center space-x-4">
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={hasError ? "Search unavailable" : "Search structure..."}
              disabled={hasError}
              className={`pl-10 pr-8 py-1.5 border rounded text-sm focus:outline-none w-64 ${
                hasError 
                  ? "bg-gray-800 border-gray-600 text-gray-500 placeholder-gray-600 cursor-not-allowed"
                  : "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500"
              }`}
            />
            {searchQuery && !hasError && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
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
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                hasError 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : showComments
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={hasError ? 'Unavailable due to parse error' : showComments ? 'Hide comments' : 'Show comments'}
            >
              <MessageSquare size={12} />
              <span>Comments</span>
            </button>

            <button
              onClick={hasError ? undefined : onTogglePaths}
              disabled={hasError}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                hasError 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : showPaths
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
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
              className={`p-1.5 rounded transition-colors ${
                canUndo 
                  ? "hover:bg-gray-700 text-gray-300" 
                  : "text-gray-500 cursor-not-allowed"
              }`}
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo 
                  ? "hover:bg-gray-700 text-gray-300" 
                  : "text-gray-500 cursor-not-allowed"
              }`}
              title="Redo"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Right side: Document info and status */}
        <div className="flex items-center space-x-4 text-sm text-gray-400">
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
            <CheckCircle size={14} className="text-green-400" />
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