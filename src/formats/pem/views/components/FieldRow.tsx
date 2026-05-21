import React, { useState, useCallback } from "react";
import { Copy, Check } from "../../../../components/Icons";

interface Props {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}

export const FieldRow: React.FC<Props> = ({ label, value, mono = false, copyable = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-base last:border-0">
      <span className="text-secondary text-xs w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`flex-1 text-xs text-main break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
      {copyable && (
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-0.5 rounded hover:bg-element text-secondary hover:text-main transition-colors"
          title="Copy"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
};
