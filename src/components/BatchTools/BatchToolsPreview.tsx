import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

interface BatchToolsPreviewProps {
  originalContent: string;
  transformedContent: string;
  previewMode: 'unified' | 'side-by-side';
  isProcessing: boolean;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

export const BatchToolsPreview: React.FC<BatchToolsPreviewProps> = ({
  originalContent,
  transformedContent,
  previewMode,
  isProcessing
}) => {
  const diff = useMemo(() => {
    if (previewMode === 'side-by-side') {
      return null; // Side-by-side doesn't need diff computation
    }

    // Simple unified diff
    const originalLines = originalContent.split('\n');
    const transformedLines = transformedContent.split('\n');
    const diffLines: DiffLine[] = [];

    const maxLines = Math.max(originalLines.length, transformedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const transformedLine = transformedLines[i] || '';
      
      if (originalLine === transformedLine) {
        diffLines.push({
          type: 'unchanged',
          content: originalLine,
          lineNumber: i + 1,
        });
      } else {
        if (originalLine && originalLine !== transformedLine) {
          diffLines.push({
            type: 'removed',
            content: originalLine,
            lineNumber: i + 1,
          });
        }
        if (transformedLine && transformedLine !== originalLine) {
          diffLines.push({
            type: 'added',
            content: transformedLine,
            lineNumber: i + 1,
          });
        }
      }
    }

    return diffLines;
  }, [originalContent, transformedContent, previewMode]);

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Processing transformations...</span>
      </div>
    );
  }

  if (previewMode === 'side-by-side') {
    return (
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Original */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Original</h3>
            <span className="text-xs text-gray-500">
              {originalContent.split('\n').length} lines
            </span>
          </div>
          <div className="flex-1 overflow-auto bg-gray-900 rounded border border-gray-700 custom-scrollbar">
            <pre className="p-3 text-sm text-gray-300 whitespace-pre-wrap break-words">
              {originalContent || <span className="text-gray-500 italic">No content</span>}
            </pre>
          </div>
        </div>

        {/* Transformed */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Transformed</h3>
            <span className="text-xs text-gray-500">
              {transformedContent.split('\n').length} lines
            </span>
          </div>
          <div className="flex-1 overflow-auto bg-gray-900 rounded border border-gray-700 custom-scrollbar">
            <pre className="p-3 text-sm text-gray-300 whitespace-pre-wrap break-words">
              {transformedContent || <span className="text-gray-500 italic">No content</span>}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Unified diff view
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Unified Diff</h3>
        <span className="text-xs text-gray-500">
          {diff?.length || 0} changes
        </span>
      </div>
      
      <div className="flex-1 overflow-auto bg-gray-900 rounded border border-gray-700 custom-scrollbar">
        {diff && diff.length > 0 ? (
          <div className="text-sm">
            {diff.map((line, index) => (
              <div
                key={index}
                className={`px-3 py-1 flex ${
                  line.type === 'added'
                    ? 'bg-green-900/30 text-green-300'
                    : line.type === 'removed'
                    ? 'bg-red-900/30 text-red-300'
                    : 'text-gray-300'
                }`}
              >
                <span className="w-8 flex-shrink-0 text-gray-500 text-right mr-3">
                  {line.lineNumber}
                </span>
                <span className="w-4 flex-shrink-0 text-center">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words">
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-gray-500 italic">
            No changes detected
          </div>
        )}
      </div>
    </div>
  );
}; 