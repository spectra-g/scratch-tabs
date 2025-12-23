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
    <div className="bg-surface-secondary/50 border border-base rounded-lg overflow-hidden">
      <div className="bg-surface-secondary/80 px-4 py-3 border-b border-base">
        <h3 className="text-main font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-secondary mt-1">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-4">
        {children}
        {result !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="flex-1 font-mono text-sm bg-surface-secondary/50 text-main px-3 py-2 rounded-md break-all border border-base">
              {result || "No result"}
            </div>
            <button
              onClick={handleCopy}
              disabled={!result}
              className={`
                p-2 rounded-md transition-colors
                ${result
                  ? "text-secondary hover:text-main hover:bg-element-hover"
                  : "text-muted cursor-not-allowed"
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
