import React from "react";
import { Copy } from "../../../components/Icons";

interface RedactionPreviewProps {
  value: string;
  onCopy: () => void;
}

export const RedactionPreview: React.FC<RedactionPreviewProps> = ({ value, onCopy }) => {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-base px-4 py-3">
        <h2 className="text-sm font-semibold text-main">Redaction preview</h2>
        <button
          type="button"
          onClick={onCopy}
          disabled={!value}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-2 text-sm text-main hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={16} />
          Copy Redacted
        </button>
      </div>
      <pre data-testid="secret-scanner-redacted" className="min-h-0 flex-1 overflow-auto custom-scrollbar whitespace-pre-wrap break-words bg-canvas p-4 font-mono text-xs text-secondary">
        {value || "Run a scan to generate safe redacted output."}
      </pre>
    </section>
  );
};
