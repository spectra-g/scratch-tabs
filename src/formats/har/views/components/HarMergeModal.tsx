import React, { useState } from "react";
import { X } from "lucide-react";

interface HarMergeModalProps {
  onMerge: (content: string) => string | null;
  onClose: () => void;
}

export const HarMergeModal: React.FC<HarMergeModalProps> = ({ onMerge, onClose }) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleMerge = () => {
    const mergeError = onMerge(content);
    if (mergeError) {
      setError(mergeError);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
      <div className="flex max-h-[82vh] w-[min(760px,92vw)] flex-col rounded-lg border border-base bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-base px-4 py-3">
          <h2 className="flex-1 text-sm font-semibold text-main">Merge HAR Content</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-secondary transition-colors hover:bg-element-hover hover:text-main"
            aria-label="Close merge modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setError(null);
            }}
            className="min-h-[320px] resize-none rounded border border-base bg-element p-3 font-mono text-xs text-main outline-none focus:border-focus"
            placeholder="Paste another HAR JSON file here..."
            data-testid="har-merge-textarea"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-base px-4 py-3">
          <button
            onClick={onClose}
            className="rounded border border-base bg-element px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-element-hover hover:text-main"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={content.trim().length === 0}
            className="rounded border border-primary/50 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
};
