import React, { useState, useMemo, useCallback } from "react";
import { BaseModal } from "./BaseModal";
import { Editor } from "@monaco-editor/react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Tab } from "../../../../types";
import { createTab } from "../../../../utils/tabUtils";
import { useDebounce } from "../../../../hooks/useDebounce";
import { extractData } from "../../utils/jsonQuery";
import { useThemeStore } from "../../../../stores/themeStore";

interface ExtractDataModalProps {
  jsonString: string;
  onClose: () => void;
  addTab: (tab: Tab) => void;
}

export const ExtractDataModal: React.FC<ExtractDataModalProps> = ({
  jsonString,
  onClose,
  addTab,
}) => {
  const { isDarkMode } = useThemeStore();
  const [arrayPath, setArrayPath] = useState("");
  const [propertyToExtract, setPropertyToExtract] = useState("");
  const [condition, setCondition] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Debounce inputs to avoid excessive re-computation
  const debouncedArrayPath = useDebounce(arrayPath, 300);
  const debouncedProperty = useDebounce(propertyToExtract, 300);
  const debouncedCondition = useDebounce(condition, 300);

  const { results, error } = useMemo(() => {
    return extractData(jsonString, {
      arrayPath: debouncedArrayPath,
      propertyToExtract: debouncedProperty,
      condition: debouncedCondition,
    });
  }, [jsonString, debouncedArrayPath, debouncedProperty, debouncedCondition]);

  const resultsString = useMemo(() => {
    return JSON.stringify(results, null, 2);
  }, [results]);

  const handleCopy = useCallback(async () => {
    if (!resultsString) return;
    await navigator.clipboard.writeText(resultsString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [resultsString]);

  const handleOpenInNewTab = useCallback(() => {
    addTab(
      createTab({
        title: "Extracted Data",
        content: resultsString,
        language: "json",
      }),
    );
    onClose();
  }, [addTab, resultsString, onClose]);

  return (
    <BaseModal title="Extract Data from JSON" onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="p-4 space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-themed-secondary mb-1">
              Path to Array
            </label>
            <input
              type="text"
              value={arrayPath}
              onChange={(e) => setArrayPath(e.target.value)}
              placeholder="e.g., users or data.items[0].tags"
              className="w-full px-3 py-2 input-themed rounded text-sm placeholder:text-themed-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-themed-secondary mb-1">
              Property to Extract
            </label>
            <input
              type="text"
              value={propertyToExtract}
              onChange={(e) => setPropertyToExtract(e.target.value)}
              placeholder="e.g., id or user.profile.name"
              className="w-full px-3 py-2 input-themed rounded text-sm placeholder:text-themed-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-themed-secondary mb-1">
            Filter Condition (optional)
          </label>
          <input
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g., age >= 18 or status == 'active'"
            className="w-full px-3 py-2 input-themed rounded text-sm placeholder:text-themed-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Results Preview */}
        <div>
          <label className="block text-sm font-medium text-themed-secondary mb-2">
            Preview ({results.length} item{results.length !== 1 ? 's' : ''} found)
          </label>
          <div className="h-64 border border-themed rounded-lg overflow-hidden relative">
            <Editor
              height="100%"
              language="json"
              value={error ? `// Error: ${error}` : resultsString}
              theme={isDarkMode ? "vs-dark" : "vs"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
              }}
            />
             <div className="absolute top-2 right-2 flex space-x-1">
              <button
                onClick={handleCopy}
                disabled={results.length === 0 || !!error}
                className="p-2 bg-themed-secondary/90 rounded-md transition-colors icon-themed icon-themed-hover bg-themed-hover disabled:opacity-50"
                title="Copy to clipboard"
              >
                {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
              <button
                onClick={handleOpenInNewTab}
                disabled={results.length === 0 || !!error}
                className="p-2 bg-themed-secondary/90 rounded-md transition-colors icon-themed icon-themed-hover bg-themed-hover disabled:opacity-50"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
