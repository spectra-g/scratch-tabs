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
  AlertTriangle
} from '../../../../components/Icons';
import { YamlDocument } from '../../utils/yamlParser';

interface YamlToolbarProps {
  showComments: boolean;
  showPaths: boolean;
  searchQuery: string;
  onToggleComments: () => void;
  onTogglePaths: () => void;
  onSearchChange: (query: string) => void;
  documentCount: number;
  activeDocument: YamlDocument | null;
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
              placeholder="Search structure..."
              className="pl-10 pr-8 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500 w-64"
            />
            {searchQuery && (
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
              onClick={onToggleComments}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                showComments
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={showComments ? 'Hide comments' : 'Show comments'}
            >
              <MessageSquare size={12} />
              <span>Comments</span>
            </button>

            <button
              onClick={onTogglePaths}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                showPaths
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title={showPaths ? 'Hide paths' : 'Show paths'}
            >
              <Hash size={12} />
              <span>Paths</span>
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