import React, { useState, useEffect } from "react";
import { TrimUIProps } from "../../formats/types";
import { shareService } from "../../services/shareService";

/**
 * Default trim UI for text-based content
 * Allows user to select a range of lines to include in share
 */
export const DefaultTextRangeTrimUI: React.FC<TrimUIProps> = ({
  content,
  onSelectionChange,
  maxSize,
}) => {
  const lines = content.split("\n");
  const totalLines = lines.length;

  // Default to showing all content
  const defaultStart = 0;
  const defaultEnd = Math.max(0, totalLines - 1);

  const [startLine, setStartLine] = useState(defaultStart);
  const [endLine, setEndLine] = useState(defaultEnd);

  // For single line content, ensure we handle it gracefully
  const isSingleLine = totalLines === 1;

  // Calculate trimmed content and size
  useEffect(() => {
    const trimmedContent = lines.slice(startLine, endLine + 1).join("\n");
    const size = shareService.estimateUrlLength("text", trimmedContent);

    onSelectionChange({
      start: startLine,
      end: endLine,
      content: trimmedContent,
      size,
    });
  }, [startLine, endLine]);

  // Auto-adjust to fit within size limit
  useEffect(() => {
    if (startLine === 0 && endLine === totalLines - 1) {
      // Try to find a range that fits
      let testEnd = totalLines - 1;
      while (testEnd > 0) {
        const testContent = lines.slice(0, testEnd).join("\n");
        const testSize = shareService.estimateUrlLength("text", testContent);
        if (testSize <= maxSize) {
          setEndLine(testEnd - 1);
          break;
        }
        testEnd = Math.floor(testEnd * 0.8); // Reduce by 20% each iteration
      }
    }
  }, []);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setStartLine(Math.min(value, endLine));
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setEndLine(Math.max(value, startLine));
  };

  const selectedLines = endLine - startLine + 1;
  const percentOfTotal = ((selectedLines / totalLines) * 100).toFixed(0);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title */}
      <div className="flex-shrink-0">
        <h3 className="text-sm font-medium text-main mb-1">
          Select Line Range
        </h3>
        <p className="text-xs text-secondary">
          Choose which lines to include in the shareable URL
        </p>
      </div>

      {/* Line range controls */}
      {isSingleLine ? (
        <div className="bg-surface-secondary rounded p-3 text-xs text-secondary flex-shrink-0">
          <p className="text-center">
            Content has only one line. All content will be included in the share.
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-shrink-0">
          {/* Start line */}
          <div>
            <label className="text-xs text-secondary block mb-1">
              Start Line
            </label>
            <input
              type="range"
              min={0}
              max={totalLines - 1}
              value={startLine}
              onChange={handleStartChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>Line {startLine + 1}</span>
              <span>{lines[startLine]?.substring(0, 30) || ""}...</span>
            </div>
          </div>

          {/* End line */}
          <div>
            <label className="text-xs text-secondary block mb-1">
              End Line
            </label>
            <input
              type="range"
              min={0}
              max={totalLines - 1}
              value={endLine}
              onChange={handleEndChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>Line {endLine + 1}</span>
              <span>{lines[endLine]?.substring(0, 30) || ""}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Selection summary */}
      <div className="bg-surface-secondary rounded p-3 text-xs space-y-1 flex-shrink-0">
        <div className="flex justify-between text-secondary">
          <span>Selected Lines:</span>
          <span className="text-main font-medium">
            {selectedLines.toLocaleString()} of {totalLines.toLocaleString()} ({percentOfTotal}%)
          </span>
        </div>
        <div className="flex justify-between text-secondary">
          <span>Range:</span>
          <span className="text-main font-medium">
            Lines {startLine + 1} - {endLine + 1}
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 min-h-0">
        <label className="text-xs text-secondary block mb-2">
          Preview ({selectedLines.toLocaleString()} lines selected)
        </label>
        <div className="bg-canvas border border-base rounded p-3 text-xs font-mono text-secondary h-64 overflow-y-auto custom-scrollbar">
          {lines.slice(startLine, endLine + 1).map((line, i) => (
            <div key={i} className="hover:bg-element-hover px-1 -mx-1">
              <span className="text-muted inline-block w-12 text-right mr-2 select-none">
                {startLine + i + 1}
              </span>
              <span className="text-main whitespace-pre">{line || ' '}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted mt-1">
          Scroll to see all selected content
        </div>
      </div>
    </div>
  );
};
