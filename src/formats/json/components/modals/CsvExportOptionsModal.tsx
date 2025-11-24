import React, { useState, useMemo } from "react";
import { BaseModal } from "./BaseModal";
import { CsvOptions, convertToCsv } from "../../utils/generateCsv";
import { Editor } from "@monaco-editor/react";
import { Download, Copy, Check, Info } from "lucide-react";
import { useThemeStore } from "../../../../stores/themeStore";

interface CsvExportOptionsModalProps {
  jsonString: string;
  onClose: () => void;
}

/**
 * Modal for configuring and previewing CSV export from JSON.
 * Provides intelligent flattening options and real-time preview.
 */
export const CsvExportOptionsModal: React.FC<CsvExportOptionsModalProps> = ({
  jsonString,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();
  const [options, setOptions] = useState<CsvOptions>({
    delimiter: ",",
    includeHeaders: true,
    arrayExpansion: "expandFirst",
  });
  const [isCopied, setIsCopied] = useState(false);

  // Generate CSV with current options
  const { csv, error } = useMemo(() => {
    try {
      return convertToCsv(jsonString, options);
    } catch (e: any) {
      return { csv: "", error: e.message || "Unknown error" };
    }
  }, [jsonString, options]);

  const handleDownload = () => {
    if (!csv || error) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!csv || error) return;

    try {
      await navigator.clipboard.writeText(csv);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  // Get strategy description
  const getStrategyDescription = (strategy: string): string => {
    switch (strategy) {
      case "expandFirst":
        return "Expands only the first array found in each object. Other arrays are stringified. Safest option that prevents row explosion.";
      case "expandAll":
        return "Expands all arrays, creating a Cartesian product. Can create many rows if multiple arrays exist. Use carefully!";
      case "stringify":
        return "Legacy mode. All arrays are stringified as JSON. No intelligent expansion.";
      default:
        return "";
    }
  };

  return (
    <BaseModal
      title="CSV Export Options"
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="flex flex-col p-4 space-y-4" style={{ height: "80vh" }}>
        {/* Options Panel */}
        <div className="flex-none">
          <h3 className="text-sm font-medium text-themed-secondary mb-3">
            Export Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-themed-secondary rounded-lg border border-themed">
            {/* Array Expansion Strategy */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-themed-secondary mb-2">
                Array Expansion Strategy
              </label>
              <select
                value={options.arrayExpansion}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    arrayExpansion: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expandFirst">
                  Expand First Array Only (Recommended)
                </option>
                <option value="expandAll">
                  Expand All Arrays (Cartesian Product)
                </option>
                <option value="stringify">Stringify All Arrays (Legacy)</option>
              </select>

              {/* Strategy Description */}
              <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                <div className="flex items-start">
                  <Info size={16} className="mr-2 mt-0.5 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    {getStrategyDescription(options.arrayExpansion)}
                  </p>
                </div>
              </div>
            </div>

            {/* Delimiter */}
            <div>
              <label className="block text-sm font-medium text-themed-secondary mb-2">
                Delimiter
              </label>
              <select
                value={options.delimiter === "\t" ? "tab" : "comma"}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    delimiter: e.target.value === "tab" ? "\t" : ","
                  })
                }
                className="w-full px-3 py-2 input-themed rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="comma">Comma (,)</option>
                <option value="tab">Tab</option>
              </select>
            </div>

            {/* Include Headers */}
            <div>
              <label className="block text-sm font-medium text-themed-secondary mb-2">
                Include Headers
              </label>
              <div className="flex items-center h-[38px]">
                <input
                  type="checkbox"
                  checked={options.includeHeaders}
                  onChange={(e) =>
                    setOptions({ ...options, includeHeaders: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 bg-themed border-themed rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-themed-secondary">
                  Add header row
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col" style={{ minHeight: "500px" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-themed-secondary">
              CSV Preview
              {csv && !error && (
                <span className="ml-2 text-xs text-themed-muted">
                  ({csv.split("\n").length} rows)
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                disabled={!csv || !!error}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-themed-secondary bg-themed-hover disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!csv || !!error}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download CSV file"
              >
                <Download size={16} />
                <span className="text-xs">Download</span>
              </button>
            </div>
          </div>

          <div className="flex-1 border border-themed rounded-lg overflow-hidden" style={{ minHeight: "450px" }}>
            <Editor
              height="100%"
              language="csv"
              value={error ? `# Error: ${error}` : csv}
              theme={isDarkMode ? "vs-dark" : "vs"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: "off",
                scrollBeyondLastLine: false,
                lineNumbers: "on",
              }}
            />
          </div>
        </div>

        {/* Info Footer */}
        <div className="flex-none pt-3 border-t border-themed">
          <div className="text-xs text-themed-tertiary">
            <span className="font-medium">Tip:</span> The export intelligently
            flattens nested objects (e.g., user.name → user.name column). Arrays
            create multiple rows with duplicated parent data, making the CSV
            fully filterable and usable in spreadsheets.
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
