import React, { useRef, useEffect } from "react";
import { Copy, Save, X, Check } from "lucide-react";

interface VaultScratchpadProps {
  content: string;
  isOpen: boolean;
  onContentChange: (content: string) => void;
  onClose: () => void;
  onCopy: () => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  isCopied: boolean;
  hasSourceItem: boolean;
}

export const VaultScratchpad: React.FC<VaultScratchpadProps> = ({
  content,
  isOpen,
  onContentChange,
  onClose,
  onCopy,
  onSave,
  onSaveAsNew,
  isCopied,
  hasSourceItem,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-base bg-surface-secondary w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base bg-surface-raised">
        <h3 className="text-sm font-semibold text-main">Scratchpad</h3>
        <button
          onClick={onClose}
          className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
          title="Close scratchpad"
        >
          <X size={16} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Modify your command here before copying or saving..."
          className="w-full min-h-[200px] bg-surface border border-base rounded px-3 py-2 text-sm font-mono text-main placeholder-muted resize-none outline-none focus:border-focus transition-colors"
        />
        <p className="mt-2 text-xs text-muted">
          Edit the command above. Changes won't affect the original until you
          save as new.
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-base space-y-2">
        <button
          onClick={onCopy}
          disabled={!content.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-element hover:bg-element-hover border border-base text-main rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          <span>{isCopied ? "Copied!" : "Copy"}</span>
        </button>
        {hasSourceItem && (
          <button
            onClick={onSave}
            disabled={!content.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-element hover:bg-element-hover border border-base text-main rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
        )}
        <button
          onClick={onSaveAsNew}
          disabled={!content.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-element hover:bg-element-hover border border-base text-main rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          <span>Save as New</span>
        </button>
      </div>
    </div>
  );
};
