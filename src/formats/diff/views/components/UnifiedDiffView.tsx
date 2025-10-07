import React, { useRef, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileDiff, Hunk, DiffLine } from '../../utils/parser';
import { ChevronDown, ChevronRight, Copy } from '../../../../components/Icons';

interface UnifiedDiffViewProps {
  file: FileDiff;
  hideWhitespaceChanges: boolean;
  collapsedHunks: Set<string>;
  onToggleHunk: (hunkId: string) => void;
}

interface RenderItem {
  type: 'hunk-header' | 'line';
  hunk: Hunk;
  hunkId: string;
  line?: DiffLine;
  lineNumber?: number;
}

export const UnifiedDiffView: React.FC<UnifiedDiffViewProps> = ({
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

      // Add lines
      const filteredLines = hideWhitespaceChanges 
        ? hunk.lines.filter(line => !line.isWhitespaceOnly)
        : hunk.lines;

      filteredLines.forEach((line) => {
        const lineNumber = line.type === 'deletion' 
          ? line.originalLineNumber 
          : line.newLineNumber;

        items.push({
          type: 'line',
          hunk,
          hunkId: hunk.id,
          line,
          lineNumber,
        });
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
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // Handle copying line content
  const handleCopyLine = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy line:', error);
    }
  };

  // Get line styling based on type
  const getLineStyle = (line: DiffLine) => {
    switch (line.type) {
      case 'addition':
        return 'bg-green-500/10 text-green-200 border-l-2 border-green-500';
      case 'deletion':
        return 'bg-red-500/10 text-red-200 border-l-2 border-red-500';
      case 'context':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  // Get line prefix
  const getLinePrefix = (line: DiffLine) => {
    switch (line.type) {
      case 'addition': return '+';
      case 'deletion': return '-';
      case 'context': return ' ';
      default: return ' ';
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
      {/* Header */}
      <div className="flex-none border-b border-gray-700 bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-300">
          {file.fileName}
        </h3>
      </div>

      {/* Virtualized content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar font-mono text-sm"
        style={{ contain: 'strict' }}
        data-testid="unified-diff"
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
              <VirtualRow
                key={virtualItem.key}
                virtualItem={virtualItem}
                rowVirtualizer={rowVirtualizer}
                item={item}
                collapsedHunks={collapsedHunks}
                onToggleHunk={onToggleHunk}
                handleCopyLine={handleCopyLine}
                getLineStyle={getLineStyle}
                getLinePrefix={getLinePrefix}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Separate component for each virtual row to handle measurement
const VirtualRow: React.FC<{
  virtualItem: any;
  rowVirtualizer: any;
  item: RenderItem;
  collapsedHunks: Set<string>;
  onToggleHunk: (hunkId: string) => void;
  handleCopyLine: (content: string) => void;
  getLineStyle: (line: DiffLine) => string;
  getLinePrefix: (line: DiffLine) => string;
}> = ({ virtualItem, rowVirtualizer, item, collapsedHunks, onToggleHunk, handleCopyLine, getLineStyle, getLinePrefix }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current && typeof rowVirtualizer.measureElement === 'function') {
      rowVirtualizer.measureElement(rowRef.current);
    }
  }, [rowVirtualizer, item]);

  return (
    <div
      ref={rowRef}
      data-index={virtualItem.index}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
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
        <div className={`flex border-b border-gray-700/30 ${getLineStyle(item.line!)}`}>
          {/* Line number */}
          <div className="w-12 flex-shrink-0 text-center text-gray-500 text-xs py-1 border-r border-gray-700/50">
            {item.lineNumber}
          </div>

          {/* Prefix */}
          <div className="w-6 flex-shrink-0 text-center text-xs py-1 border-r border-gray-700/50">
            {getLinePrefix(item.line!)}
          </div>

          {/* Content */}
          <div className="flex-1 px-3 py-1 group relative">
            <span>{item.line!.content}</span>
            <button
              onClick={() => handleCopyLine(item.line!.content)}
              className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
              title="Copy line"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};