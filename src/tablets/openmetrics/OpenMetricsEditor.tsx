import React, { useRef, useEffect } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { ParseResult } from "./types";

interface OpenMetricsEditorProps {
  value: string;
  onChange: (value: string) => void;
  parseResult: ParseResult | null;
  parseError: string | null;
  isLoading: boolean;
}

export const OpenMetricsEditor: React.FC<OpenMetricsEditorProps> = ({
  value,
  onChange,
  parseResult,
  parseError,
  isLoading,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorLinesRef = useRef<HTMLDivElement>(null);

  // Sync scroll position between textarea and error lines
  useEffect(() => {
    const textarea = textareaRef.current;
    const errorLines = errorLinesRef.current;

    if (!textarea || !errorLines) return;

    const handleScroll = () => {
      errorLines.scrollTop = textarea.scrollTop;
    };

    textarea.addEventListener("scroll", handleScroll);
    return () => textarea.removeEventListener("scroll", handleScroll);
  }, []);

  // Create line number markers for errors
  const errorLineMarkers = parseResult?.errors.map((error) => {
    const lineNumber = error.line;
    const lineHeight = 20; // Approximate line height in pixels
    const top = (lineNumber - 1) * lineHeight;

    return (
      <div
        key={`error-${lineNumber}`}
        className="absolute left-0 right-0 bg-danger-subtle flex items-center px-2"
        style={{ top: `${top}px`, height: `${lineHeight}px` }}
        title={error.message}
      >
        <AlertCircle size={12} className="text-red-500 mr-1" />
        <span className="text-xs text-red-400 truncate">{error.message}</span>
      </div>
    );
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-base flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            {isLoading ? (
              <Loader size={16} className="text-primary animate-spin mr-2" />
            ) : parseError ? (
              <AlertCircle size={16} className="text-red-400 mr-2" />
            ) : (
              <CheckCircle size={16} className="text-green-400 mr-2" />
            )}
            <span className="text-sm">
              {isLoading
                ? "Parsing..."
                : parseError
                  ? "Parse Error"
                  : `${parseResult?.stats.uniqueMetricNames || 0} metrics, ${parseResult?.stats.totalMetrics || 0} samples`}
            </span>
          </div>

          {parseResult && !parseError && (
            <div className="text-sm text-muted">
              {parseResult.stats.uniqueLabelNames} label names,{" "}
              {parseResult.stats.totalLabels} label values
            </div>
          )}
        </div>

        {parseError && <div className="text-sm text-red-400">{parseError}</div>}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Error line markers container */}
        <div
          ref={errorLinesRef}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ paddingTop: "10px" }}
        >
          {errorLineMarkers}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-canvas text-main font-mono p-2.5 resize-none focus:outline-none"
          style={{
            lineHeight: "20px",
            tabSize: 2,
            caretColor: "white",
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
