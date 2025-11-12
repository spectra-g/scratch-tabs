import React, { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import { BaseModal } from "./BaseModal";
import {
  compareJsonEquality,
  EqualityResult,
  DifferenceDetail,
} from "../../utils/jsonDeepEquality";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useDebounce } from "../../../../hooks/useDebounce";

interface JsonEqualityCheckModalProps {
  sourceJson: string;
  onClose: () => void;
}

/**
 * Component to preview JSON values in a formatted, readable way.
 * Handles both compact and multiline display based on content.
 */
const ValuePreview: React.FC<{ value: any }> = ({ value }) => {
  if (value === undefined) return null;

  const content = JSON.stringify(value, null, 2);
  const isShort = content.length < 80 && !content.includes("\n");

  return (
    <pre
      className={`p-2 rounded text-xs custom-scrollbar ${
        isShort ? "inline-block" : "max-h-24 overflow-auto"
      } bg-gray-900/70 border border-gray-700/50`}
    >
      <code>{content}</code>
    </pre>
  );
};

/**
 * Component to display a single difference with rich formatting.
 * Shows path, type, message, and side-by-side value comparison.
 */
const DifferenceItem: React.FC<{ diff: DifferenceDetail }> = ({ diff }) => (
  <div className="mb-4 pb-4 border-b border-gray-700/60 last:border-b-0 last:mb-0 last:pb-0">
    {/* Header: Path and Type */}
    <div className="flex items-center justify-between mb-2">
      <code className="text-sm text-gray-300 bg-gray-700/50 px-2 py-1 rounded">
        {diff.path}
      </code>
      <span className="text-xs font-semibold text-red-400 px-2 py-1 bg-red-900/30 rounded-full">
        {diff.type.replace(/_/g, " ")}
      </span>
    </div>

    {/* Message */}
    <p className="text-sm text-gray-300 mb-3">{diff.message}</p>

    {/* Value Comparison */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      <div>
        <span className="font-semibold text-gray-400 block mb-1">
          Source Value:
        </span>
        <ValuePreview value={diff.leftValue} />
      </div>
      <div>
        <span className="font-semibold text-gray-400 block mb-1">
          Target Value:
        </span>
        <ValuePreview value={diff.rightValue} />
      </div>
    </div>
  </div>
);

/**
 * Modal for deep equality checking of JSON objects.
 * Features:
 * - Order-insensitive comparison for objects and arrays
 * - Intelligent array analysis (matched, missing, extra items)
 * - Rich difference reporting with value previews
 * - Spacious layout with dedicated results area
 */
export const JsonEqualityCheckModal: React.FC<JsonEqualityCheckModalProps> = ({
  sourceJson,
  onClose,
}) => {
  const [targetJson, setTargetJson] = useState("");
  const [result, setResult] = useState<EqualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce to avoid excessive computation while typing
  const debouncedTargetJson = useDebounce(targetJson, 400);

  // Run comparison when target JSON changes
  useEffect(() => {
    if (!debouncedTargetJson.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    try {
      const comparisonResult = compareJsonEquality(
        sourceJson,
        debouncedTargetJson
      );
      setResult(comparisonResult);
      setError(null);
    } catch (err: any) {
      setError(err.message || "An error occurred during comparison");
      setResult(null);
    }
  }, [sourceJson, debouncedTargetJson]);

  return (
    <BaseModal
      title="Deep JSON Equality Check"
      onClose={onClose}
      maxWidthClass="max-w-7xl"
      maxHeightClass="max-h-[95vh]"
    >
      <div className="flex flex-col h-full">
        {/* Top Section: Editors */}
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-[45vh]">
          {/* Source Editor (Read-only) */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Source JSON (Current)
            </h3>
            <div className="flex-1 border border-gray-700/50 rounded-lg overflow-hidden min-h-0">
              <Editor
                height="100%"
                language="json"
                value={sourceJson}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            </div>
          </div>

          {/* Target Editor (Editable) */}
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              Target JSON (To Compare)
            </h3>
            <div className="flex-1 border border-gray-700/50 rounded-lg overflow-hidden min-h-0">
              <Editor
                height="100%"
                language="json"
                value={targetJson}
                onChange={(value) => setTargetJson(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  folding: true,
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Results */}
        <div className="flex-none p-4 border-t border-gray-700/60 min-h-[250px] max-h-[45vh] flex flex-col bg-gray-800/30">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex-none">
            Comparison Result
          </h3>

          {/* Scrollable Results Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-800/50 p-4 rounded-lg">
            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
                <div className="flex items-start">
                  <XCircle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm mb-1">
                      Comparison Error
                    </div>
                    <div className="text-xs text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!error && !result && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Info size={18} className="mr-3" />
                <span className="text-sm">
                  Paste or type JSON in the right panel to compare with the source.
                </span>
              </div>
            )}

            {/* Equal State */}
            {!error && result?.isEqual && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle2 size={24} className="mx-auto mb-3 text-green-400" />
                  <span className="font-medium text-lg text-green-300 block">
                    The JSON objects are deeply equal
                  </span>
                  <span className="text-xs text-green-400/70 mt-2 block">
                    Both objects have the same structure, keys, and values
                    (order-insensitive).
                  </span>
                </div>
              </div>
            )}

            {/* Differences State */}
            {!error && result && !result.isEqual && (
              <div>
                {/* Summary Header */}
                <div className="mb-4 p-3 bg-red-900/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center">
                    <XCircle size={18} className="mr-3 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-red-300">
                        Found {result.differences.length} difference
                        {result.differences.length !== 1 ? "s" : ""}
                      </div>
                      <div className="text-xs text-red-400/70 mt-0.5">
                        Arrays are compared order-insensitively as multisets
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difference List */}
                <div>
                  {result.differences.map((diff, index) => (
                    <DifferenceItem key={index} diff={diff} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="flex-none pt-3 mt-3 border-t border-gray-700/50">
            <div className="text-xs text-gray-500">
              <span className="font-medium">Note:</span> Comparison is
              order-insensitive for both object keys and array elements. Arrays
              are treated as multisets (duplicates are preserved).
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
