import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StackFrame } from '../../utils/parser';
import { StackFrameComponent } from './StackFrameComponent';

interface FrameListProps {
  frames: StackFrame[];
  hideLibraryFrames: boolean;
  searchFilter: string;
}

export const FrameList: React.FC<FrameListProps> = ({
  frames,
  hideLibraryFrames,
  searchFilter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter frames based on current settings
  const filteredFrames = useMemo(() => {
    return frames.filter(frame => {
      // Filter library frames
      if (hideLibraryFrames && frame.isLibraryFrame) {
        return false;
      }

      // Filter by search query
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const frameText = `${frame.methodName || ''} ${frame.filePath || ''} ${frame.className || ''}`.toLowerCase();
        if (!frameText.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [frames, hideLibraryFrames, searchFilter]);

  // Set up virtualization for large lists (>100 items)
  const shouldVirtualize = filteredFrames.length > 100;
  
  const rowVirtualizer = useVirtualizer({
    count: filteredFrames.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40, // Estimated row height
    overscan: 10,
    enabled: shouldVirtualize,
  });

  if (filteredFrames.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <p>
          {frames.length === 0 
            ? 'No stack frames found'
            : searchFilter 
              ? `No frames match "${searchFilter}"`
              : 'All frames are hidden by current filters'
          }
        </p>
      </div>
    );
  }

  if (shouldVirtualize) {
    // Use virtualization for large lists
    return (
      <div
        ref={containerRef}
        className="h-full overflow-auto custom-scrollbar"
        style={{ contain: 'strict' }}
        data-testid="frame-list"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const frame = filteredFrames[virtualItem.index];
            
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
                <StackFrameComponent
                  frame={frame}
                  index={virtualItem.index}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Use simple rendering for smaller lists
  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto custom-scrollbar"
      data-testid="frame-list"
    >
      <div className="space-y-1">
        {filteredFrames.map((frame, index) => (
          <StackFrameComponent
            key={frame.id}
            frame={frame}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};