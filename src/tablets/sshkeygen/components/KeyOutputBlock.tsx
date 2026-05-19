import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface KeyOutputBlockProps {
  label: string;
  value: string;
  testId?: string;
  downloadFilename?: string;
}

export const KeyOutputBlock: React.FC<KeyOutputBlockProps> = ({
  label,
  value,
  testId,
  downloadFilename,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename ?? 'key';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted hover:text-main hover:bg-surface-secondary transition-colors"
            title="Copy"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {downloadFilename && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-muted hover:text-main hover:bg-surface-secondary transition-colors"
              title="Download"
            >
              <Download size={12} />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
      <textarea
        readOnly
        spellCheck={false}
        value={value}
        data-testid={testId}
        rows={value.startsWith('-----BEGIN') ? 10 : 4}
        className="w-full font-mono text-xs bg-surface border border-base rounded-md p-2 text-main resize-none custom-scrollbar focus:outline-none focus:border-primary/50"
      />
    </div>
  );
};
