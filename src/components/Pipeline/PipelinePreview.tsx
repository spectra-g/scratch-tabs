/**
 * Pipeline Preview Component
 *
 * Right panel showing input (editable) and output (read-only) stacked.
 */

import React from "react";
import { AlertCircle, Loader2 } from "../Icons";

interface PipelinePreviewProps {
  input: string;
  output: string;
  onInputChange: (value: string) => void;
  isRunning: boolean;
  error?: string;
  stats: {
    inputLength: number;
    outputLength: number;
    duration: number;
  };
}

export const PipelinePreview: React.FC<PipelinePreviewProps> = ({
  input,
  output,
  onInputChange,
  isRunning,
  error,
  stats,
}) => {
  const hasChanges = input !== output;

  return (
    <div className="flex flex-col h-full">
      {/* Input Section */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-base">
        <div className="p-3 border-b border-base flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-medium text-main">Input</h3>
          <span className="text-xs text-muted">
            {stats.inputLength.toLocaleString()} chars •{" "}
            {input.split("\n").length} lines
          </span>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Enter or paste content to transform..."
            className="w-full h-full resize-none bg-element border border-base rounded p-3 text-sm font-mono text-main focus:outline-none focus:border-focus custom-scrollbar"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Output Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-base flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-main">Output</h3>
            {isRunning && (
              <Loader2 className="w-4 h-4 text-secondary animate-spin" />
            )}
            {error && <AlertCircle className="w-4 h-4 text-danger" />}
            {hasChanges && !error && !isRunning && (
              <span className="text-xs text-success bg-success/10 px-1.5 py-0.5 rounded">
                Modified
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stats.duration > 0 && (
              <span className="text-xs text-muted">
                {stats.duration.toFixed(0)}ms
              </span>
            )}
            <span className="text-xs text-muted">
              {stats.outputLength.toLocaleString()} chars •{" "}
              {output.split("\n").length} lines
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-3">
          {error ? (
            <div className="h-full flex flex-col">
              <div className="p-3 bg-danger/10 border border-danger/20 rounded mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-danger">{error}</div>
                </div>
              </div>
              <textarea
                value={output}
                readOnly
                className="flex-1 w-full resize-none bg-element border border-base rounded p-3 text-sm font-mono text-muted focus:outline-none custom-scrollbar"
                spellCheck={false}
              />
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              className={`
                w-full h-full resize-none bg-element border border-base rounded p-3 text-sm font-mono focus:outline-none custom-scrollbar
                ${hasChanges ? "text-main" : "text-muted"}
              `}
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {/* Stats Footer */}
      {hasChanges && !error && (
        <div className="p-2 border-t border-base bg-surface-secondary">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {stats.inputLength > stats.outputLength ? (
                <>
                  Reduced by{" "}
                  {(
                    ((stats.inputLength - stats.outputLength) /
                      stats.inputLength) *
                    100
                  ).toFixed(1)}
                  % ({stats.inputLength - stats.outputLength} chars)
                </>
              ) : stats.inputLength < stats.outputLength ? (
                <>
                  Increased by{" "}
                  {(
                    ((stats.outputLength - stats.inputLength) /
                      stats.inputLength) *
                    100
                  ).toFixed(1)}
                  % (+{stats.outputLength - stats.inputLength} chars)
                </>
              ) : (
                "Size unchanged"
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
