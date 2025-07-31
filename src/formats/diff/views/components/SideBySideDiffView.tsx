import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileDiff, Hunk, DiffLine } from '../../utils/parser';
import { ChevronDown, ChevronRight, Copy } from '../../../../components/Icons';

interface SideBySideDiffViewProps {
  file: FileDiff;
  hideWhitespaceChanges: boolean;
  collapsedHunks: Set<string>;
  onToggleHunk: (hunkId: string) => void;
}

interface RenderItem {
  type: 'hunk-header' | 'line-pair';
  hunk: Hunk;
  hunkId: string;
  leftLine?: DiffLine;
  rightLine?: DiffLine;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

export const SideBySideDiffView: React.FC<SideBySideDiffViewProps> = ({
  file,
  hideWhitespaceChanges,
  collapsedHunks,
  onToggleHunk,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepare render items for virtualization
  const renderItems = useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];

    file.hunks.forEach((hunk) => {
      // Add hunk header
      items.push({
        type: 'hunk-header',
        hunk,
        hunkId: hunk.id,
      });

      // Skip lines if hunk is collapsed
      if (collapsedHunks.has(hunk.id)) {
        return;
      }

      // Process lines into side-by-side pairs
      let leftLineNumber = hunk.originalStartLine;
      let rightLineNumber = hunk.newStartLine;
      
      const filteredLines = hideWhitespaceChanges 
        ? hunk.lines.filter(line => !line.isWhitespaceOnly)
        : hunk.lines;

      filteredLines.forEach((line) => {
        if (line.type === 'context') {
          items.push({
            type: 'line-pair',
            hunk,
            hunkId: hunk.id,
            leftLine: line,
            rightLine: line,
            leftLineNumber,
            rightLineNumber,
          });
          leftLineNumber++;
          rightLineNumber++;
        } else if (line.type === 'deletion') {
          items.push({
            type: 'line-pair',
            hunk,
            hunkId: hunk.id,
            leftLine: line,
            leftLineNumber,
          });
          leftLineNumber++;
        } else if (line.type === 'addition') {
          items.push({
            type: 'line-pair',
            hunk,
            hunkId: hunk.id,
            rightLine: line,
            rightLineNumber,
          });
          rightLineNumber++;
        }
      });
    });

    return items;
  }, [file.hunks, hideWhitespaceChanges, collapsedHunks]);

  // Set up virtualization
  const rowVirtualizer = useVirtualizer({
    count: renderItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      const item = renderItems[index];
      return item.type === 'hunk-header' ? 40 : 24;
    },
    overscan: 20,
  });

  // Handle copying line content
  const handleCopyLine = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy line:', error);
    }
  };

  if (file.isBinary) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="mb-2">Binary file</p>
          <p className="text-sm">Cannot display binary file changes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="flex-none border-b border-gray-700 bg-gray-800">
        <div className="grid grid-cols-2 h-10">
          <div className="flex items-center justify-center border-r border-gray-700 text-sm font-medium text-gray-300">
            Original ({file.originalPath})
          </div>
          <div className="flex items-center justify-center text-sm font-medium text-gray-300">
            Modified ({file.newPath})
          </div>
        </div>
      </div>

      {/* Virtualized content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar font-mono text-sm"
        style={{ contain: 'strict' }}
        data-testid="side-by-side-diff"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const item = renderItems[virtualItem.index];
            
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {item.type === 'hunk-header' ? (
                  <div className="flex items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
                    <button
                      onClick={() => onToggleHunk(item.hunkId)}
                      className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {collapsedHunks.has(item.hunkId) ? (
                        <ChevronRight size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      <span className="text-sm font-medium">{item.hunk.header}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 border-b border-gray-700/30">
                    {/* Left side (original) */}
                    <div className={`flex border-r border-gray-700 ${
                      item.leftLine?.type === 'deletion' ? 'bg-red-500/10' : ''
                    }`}>
                      {item.leftLine && (
                        <>
                          <div className="w-12 flex-shrink-0 text-center text-gray-500 text-xs py-1 border-r border-gray-700/50">
                            {item.leftLineNumber}
                          </div>
                          <div className="flex-1 px-3 py-1 group relative">
                            <span className={`${
                              item.leftLine.type === 'deletion' ? 'text-red-200' : 'text-gray-300'
                            }`}>
                              {item.leftLine.content}
                            </span>
                            <button
                              onClick={() => handleCopyLine(item.leftLine!.content)}
                              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                              title="Copy line"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right side (modified) */}
                    <div className={`flex ${
                      item.rightLine?.type === 'addition' ? 'bg-green-500/10' : ''
                    }`}>
                      {item.rightLine && (
                        <>
                          <div className="w-12 flex-shrink-0 text-center text-gray-500 text-xs py-1 border-r border-gray-700/50">
                            {item.rightLineNumber}
                          </div>
                          <div className="flex-1 px-3 py-1 group relative">
                            <span className={`${
                              item.rightLine.type === 'addition' ? 'text-green-200' : 'text-gray-300'
                            }`}>
                              {item.rightLine.content}
                            </span>
                            <button
                              onClick={() => handleCopyLine(item.rightLine!.content)}
                              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                              title="Copy line"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};