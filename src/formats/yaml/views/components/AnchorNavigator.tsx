import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Anchor, Link, Copy } from '../../../../components/Icons';
import { AnchorInfo } from '../../utils/yamlParser';

interface AnchorNavigatorProps {
  anchors: Map<string, AnchorInfo>;
  onAnchorNavigation: (anchorName: string, isAlias: boolean) => void;
}

export const AnchorNavigator: React.FC<AnchorNavigatorProps> = ({
  anchors,
  onAnchorNavigation,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleAnchorClick = useCallback((anchorName: string) => {
    onAnchorNavigation(anchorName, false); // Navigate to anchor definition
  }, [onAnchorNavigation]);

  const handleAliasClick = useCallback((anchorName: string) => {
    onAnchorNavigation(anchorName, true); // Navigate to alias usage
  }, [onAnchorNavigation]);

  const handleCopyAnchorName = useCallback(async (anchorName: string) => {
    try {
      await navigator.clipboard.writeText(`&${anchorName}`);
    } catch (error) {
      console.error('Failed to copy anchor name:', error);
    }
  }, []);

  const anchorArray = Array.from(anchors.entries());

  if (anchorArray.length === 0) {
    return null;
  }

  return (
    <div className="flex-none border-t border-gray-700 bg-gray-800/30" data-testid="anchor-navigator">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <button
          onClick={handleToggleExpanded}
          className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors"
        >
          <Anchor size={16} />
          <span>Anchors & Aliases ({anchorArray.length})</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {anchorArray.map(([anchorName, anchorInfo]) => (
              <div
                key={anchorName}
                className="bg-gray-700/30 rounded-lg p-3 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  {/* Anchor definition */}
                  <button
                    onClick={() => handleAnchorClick(anchorName)}
                    className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
                    title={`Go to anchor definition at line ${anchorInfo.definitionLine}`}
                  >
                    <Anchor size={14} />
                    <span className="font-mono text-sm">&{anchorName}</span>
                  </button>

                  {/* Copy button */}
                  <button
                    onClick={() => handleCopyAnchorName(anchorName)}
                    className="p-1 text-gray-400 hover:text-gray-200 rounded transition-colors"
                    title="Copy anchor name"
                  >
                    <Copy size={12} />
                  </button>
                </div>

                {/* Usage count and aliases */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Line {anchorInfo.definitionLine} • {anchorInfo.usages.length} usage{anchorInfo.usages.length !== 1 ? 's' : ''}
                  </span>
                  
                  {anchorInfo.usages.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {anchorInfo.usages.slice(0, 3).map((usage, index) => (
                        <button
                          key={index}
                          onClick={() => handleAliasClick(anchorName)}
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                          title={`Go to alias usage at line ${usage.line}`}
                        >
                          <Link size={10} />
                          <span className="font-mono">*{anchorName}</span>
                        </button>
                      ))}
                      {anchorInfo.usages.length > 3 && (
                        <span className="text-gray-500">+{anchorInfo.usages.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Value preview */}
                <div className="mt-2 text-xs text-gray-400 font-mono bg-gray-800/50 rounded p-2 max-h-20 overflow-y-auto">
                  {JSON.stringify(anchorInfo.value, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};