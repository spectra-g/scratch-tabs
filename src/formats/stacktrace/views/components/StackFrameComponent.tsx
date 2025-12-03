import React, { useCallback } from 'react';
import { Copy, ExternalLink } from '../../../../components/Icons';
import { StackFrame } from '../../utils/parser';

interface StackFrameComponentProps {
  frame: StackFrame;
  index: number;
}

export const StackFrameComponent: React.FC<StackFrameComponentProps> = ({
  frame,
  index,
}) => {
  // Handle copying file path and line for IDE navigation
  const handleCopyFileLocation = useCallback(async () => {
    if (!frame.filePath) return;

    try {
      let locationText = frame.filePath;
      if (frame.lineNumber) {
        locationText += `:${frame.lineNumber}`;
        if (frame.columnNumber) {
          locationText += `:${frame.columnNumber}`;
        }
      }
      await navigator.clipboard.writeText(locationText);
    } catch (error) {
      console.error('Failed to copy file location:', error);
    }
  }, [frame]);

  // Handle copying the entire frame
  const handleCopyFrame = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(frame.raw);
    } catch (error) {
      console.error('Failed to copy frame:', error);
    }
  }, [frame.raw]);

  // Get language-specific styling
  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'java': return 'text-warning';
      case 'javascript': return 'text-warning';
      case 'python': return 'text-success';
      case 'go': return 'text-info';
      default: return 'text-secondary';
    }
  };

  return (
    <div
      className={`group flex items-center px-3 py-2 border-b border-base hover:bg-surface/50 transition-colors ${frame.isLibraryFrame ? 'opacity-60' : ''
        }`}
      data-testid="stack-frame"
    >
      {/* Frame index */}
      <div className="w-8 text-xs text-muted font-mono">
        {index + 1}
      </div>

      {/* Language indicator */}
      <div className={`w-2 h-2 rounded-full mr-3 ${getLanguageColor(frame.language)} bg-current`} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          {/* Method/Function name */}
          {frame.methodName && (
            <span className="font-mono text-sm text-main truncate">
              {frame.methodName}
            </span>
          )}

          {/* File path and line number (clickable) */}
          {frame.filePath && (
            <button
              onClick={handleCopyFileLocation}
              className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors group/file"
              title={`Copy ${frame.filePath}${frame.lineNumber ? `:${frame.lineNumber}` : ''} to clipboard`}
            >
              <span className="font-mono text-xs truncate">
                {frame.filePath}
                {frame.lineNumber && (
                  <>
                    :<span className="text-success">{frame.lineNumber}</span>
                    {frame.columnNumber && (
                      <>:<span className="text-success/80">{frame.columnNumber}</span></>
                    )}
                  </>
                )}
              </span>
              <ExternalLink size={12} className="opacity-0 group-hover/file:opacity-100 transition-opacity" />
            </button>
          )}

          {/* Class name (for Java) */}
          {frame.className && frame.className !== frame.methodName && (
            <span className="text-xs text-secondary truncate">
              in {frame.className}
            </span>
          )}
        </div>

        {/* Library frame indicator */}
        {frame.isLibraryFrame && (
          <div className="text-xs text-muted mt-1">
            Library/System Frame
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopyFrame}
          className="p-1 text-secondary hover:text-main rounded transition-colors"
          title="Copy frame to clipboard"
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
};