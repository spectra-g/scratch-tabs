import React, { useState, useCallback, useRef, useEffect } from "react";
import { Link, Clipboard, ClipboardCheck, AlertTriangle } from "lucide-react";
import { UrlWarning } from "../types";

interface UrlInputProps {
  url: string;
  warnings: UrlWarning[];
  onUrlChange: (url: string) => void;
  onPaste: () => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  url,
  warnings,
  onUrlChange,
  onPaste,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset copy state after 2 seconds
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  const handleCopy = useCallback(() => {
    if (url) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
    }
  }, [url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle keyboard shortcuts
      if (e.key === "Enter") {
        // Blur the input to trigger any validation
        inputRef.current?.blur();
      }
    },
    [],
  );

  // Check if there are any errors (not just warnings)
  const hasErrors = warnings.some(
    (w) => w.type === "error" && w.component === "full",
  );

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <Link size={16} className="text-blue-400 mr-2" />
        <h3 className="text-sm font-medium text-gray-200">URL</h3>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL (e.g., https://example.com/path?query=value#fragment)"
          className={`w-full bg-gray-800 border ${
            hasErrors ? "border-red-500" : "border-gray-700"
          } rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-20`}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {hasErrors && <AlertTriangle size={16} className="text-red-500" />}
          <button
            onClick={onPaste}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            title="Paste from clipboard"
          >
            <Clipboard size={16} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!url}
            className={`p-1 ${
              url
                ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                : "text-gray-600 cursor-not-allowed"
            } rounded`}
            title="Copy to clipboard"
          >
            {isCopied ? (
              <ClipboardCheck size={16} className="text-green-500" />
            ) : (
              <Clipboard size={16} />
            )}
          </button>
        </div>
      </div>

      {hasErrors && (
        <div className="mt-1 text-xs text-red-400">
          {
            warnings.find((w) => w.type === "error" && w.component === "full")
              ?.message
          }
        </div>
      )}
    </div>
  );
};
