import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { FileDiff, getFileDisplayName, getFileStatusBadge, getFileStatusColor } from '../../utils/parser';
import { FileText, Plus, Minus, RotateCcw, Binary } from '../../../../components/Icons';

interface FileNavigatorProps {
  files: FileDiff[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

export const FileNavigator: React.FC<FileNavigatorProps> = ({
  files,
  selectedFileId,
  onFileSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up virtualization for large file lists
  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10,
  });

  const getFileIcon = (file: FileDiff) => {
    if (file.isBinary) return <Binary size={16} className="text-primary" />;
    if (file.isNewFile) return <Plus size={16} className="text-success" />;
    if (file.isDeletedFile) return <Minus size={16} className="text-danger" />;
    if (file.isRename) return <RotateCcw size={16} className="text-info" />;
    return <FileText size={16} className="text-secondary" />;
  };

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-secondary">
        <p>No files to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-base">
        <h3 className="text-sm font-medium text-main">
          Changed Files ({files.length})
        </h3>
      </div>

      {/* File list */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ contain: 'strict' }}
        data-testid="file-navigator"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const file = files[virtualItem.index];
            const isSelected = selectedFileId === file.id;

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
                <button
                  onClick={() => onFileSelect(file.id)}
                  className={`w-full p-3 text-left border-b border-base/50 hover:bg-element-hover transition-colors ${isSelected ? 'bg-element-active border-focus/50' : ''
                    }`}
                  data-testid="file-item"
                >
                  <div className="flex items-start space-x-3">
                    {/* File icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getFileIcon(file)}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      {/* File name */}
                      <div className="font-mono text-sm text-main truncate">
                        {getFileDisplayName(file)}
                      </div>

                      {/* Status and stats */}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getFileStatusColor(file)}`}>
                          {getFileStatusBadge(file)}
                        </span>

                        {!file.isBinary && (
                          <div className="flex items-center space-x-2 text-xs text-secondary">
                            {file.stats.additions > 0 && (
                              <span className="text-success">+{file.stats.additions}</span>
                            )}
                            {file.stats.deletions > 0 && (
                              <span className="text-danger">-{file.stats.deletions}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};