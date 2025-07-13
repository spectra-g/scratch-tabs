import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface ConversionPanelProps {
  title: string;
  description?: string;
  result?: string;
  children: React.ReactNode;
}

export const ConversionPanel: React.FC<ConversionPanelProps> = ({
  title,
  description,
  result,
  children,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;

    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700/50">
        <h3 className="text-gray-200 font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-4">
        {children}
        {result !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="flex-1 font-mono text-sm bg-gray-900/50 text-gray-200 px-3 py-2 rounded-md break-all">
              {result || "No result"}
            </div>
            <button
              onClick={handleCopy}
              disabled={!result}
              className={`
                p-2 rounded-md transition-colors
                ${
                  result
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                    : "text-gray-600 cursor-not-allowed"
                }
              `}
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
