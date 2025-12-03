import React, { useMemo } from "react";
import { Loader2 } from "../Icons";

interface BatchToolsPreviewProps {
  originalContent: string;
  transformedContent: string;
  previewMode: "unified" | "side-by-side";
  isProcessing: boolean;
}

interface DiffLine {
  type: "unchanged" | "added" | "removed";
  content: string;
  lineNumber?: number;
}

export const BatchToolsPreview: React.FC<BatchToolsPreviewProps> = ({
  originalContent,
  transformedContent,
  previewMode,
  isProcessing,
}) => {
  const diff = useMemo(() => {
    if (previewMode === "side-by-side") {
      return null; // Side-by-side doesn't need diff computation
    }

    // Simple unified diff
    const originalLines = originalContent.split("\n");
    const transformedLines = transformedContent.split("\n");
    const diffLines: DiffLine[] = [];

    const maxLines = Math.max(originalLines.length, transformedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || "";
      const transformedLine = transformedLines[i] || "";

      if (originalLine === transformedLine) {
        diffLines.push({
          type: "unchanged",
          content: originalLine,
          lineNumber: i + 1,
        });
      } else {
        if (originalLine && originalLine !== transformedLine) {
          diffLines.push({
            type: "removed",
            content: originalLine,
            lineNumber: i + 1,
          });
        }
        if (transformedLine && transformedLine !== originalLine) {
          diffLines.push({
            type: "added",
            content: transformedLine,
            lineNumber: i + 1,
          });
        }
      }
    }

    return diffLines;
  }, [originalContent, transformedContent, previewMode]);

  if (previewMode === "side-by-side") {
    return (
      <div className="grid grid-cols-2 gap-4 h-full max-h-full">
        {/* Original */}
        <div className="flex flex-col h-full max-h-full min-h-0">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-base flex-shrink-0">
            <h3 className="text-sm font-medium text-main">Original</h3>
            <span className="text-xs text-muted">
              {originalContent.split("\n").length} lines • {originalContent.length} chars
            </span>
          </div>
          <div className="flex-1 min-h-0 max-h-full overflow-auto bg-surface-secondary rounded border border-base custom-scrollbar">
            <pre className="p-3 text-sm text-main whitespace-pre-wrap break-words">
              {originalContent || (
                <span className="text-muted italic">No content</span>
              )}
            </pre>
          </div>
        </div>

        {/* Transformed */}
        <div className="flex flex-col h-full max-h-full min-h-0">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-base flex-shrink-0">
            <h3 className="text-sm font-medium text-main">Transformed</h3>
            <span className="text-xs text-muted">
              {transformedContent.split("\n").length} lines • {transformedContent.length} chars
            </span>
          </div>
          <div className="flex-1 min-h-0 max-h-full overflow-auto bg-surface-secondary rounded border border-base custom-scrollbar">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted">
                  Processing transformations...
                </span>
              </div>
            ) : (
              <pre className="p-3 text-sm text-main whitespace-pre-wrap break-words">
                {transformedContent || (
                  <span className="text-muted italic">No content</span>
                )}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Unified diff view
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted">
          Processing transformations...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-base flex-shrink-0">
        <h3 className="text-sm font-medium text-secondary">Unified Diff</h3>
        <span className="text-xs text-muted">
          {diff?.length || 0} changes
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-surface-secondary rounded border border-base custom-scrollbar">
        {diff && diff.length > 0 ? (
          <div className="text-sm min-h-full">
            {diff.map((line, index) => (
              <div
                key={index}
                className={`px-3 py-1 flex ${line.type === "added"
                  ? "bg-success-subtle"
                  : line.type === "removed"
                    ? "bg-danger-subtle"
                    : "text-main"
                  }`}
              >
                <span className="w-8 flex-shrink-0 text-muted text-right mr-3">
                  {line.lineNumber}
                </span>
                <span className="w-4 flex-shrink-0 text-center">
                  {line.type === "added"
                    ? "+"
                    : line.type === "removed"
                      ? "-"
                      : " "}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words">
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-muted italic min-h-[200px] flex items-center justify-center">
            No changes detected
          </div>
        )}
      </div>
    </div>
  );
};
