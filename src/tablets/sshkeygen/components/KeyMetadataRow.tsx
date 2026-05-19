import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface KeyMetadataRowProps {
  label: string;
  value: string;
  testId?: string;
  copyable?: boolean;
}

export const KeyMetadataRow: React.FC<KeyMetadataRowProps> = ({ label, value, testId, copyable }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span data-testid={testId} className="font-mono text-sm text-main truncate">{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="shrink-0 p-0.5 rounded text-muted hover:text-main hover:bg-surface-secondary transition-colors"
            title="Copy"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
};
