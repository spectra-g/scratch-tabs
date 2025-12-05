import React, { useState, useRef, useEffect } from "react";
import { Copy, Edit2, Trash2, Check, X, FileEdit, Hash, GripVertical, Plus } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VaultItem } from "../types";

interface CommandBlockProps {
  item: VaultItem;
  onCopy: () => void;
  onOpenInScratchpad: () => void;
  onSave: (content: string, title: string) => void;
  onDelete: () => void;
  onInsertAfter: () => void;
  isCopied: boolean;
}

export const CommandBlock: React.FC<CommandBlockProps> = ({
  item,
  onCopy,
  onOpenInScratchpad,
  onSave,
  onDelete,
  onInsertAfter,
  isCopied,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.focus();
    }
  }, [isEditing, editContent]);

  const handleEdit = () => {
    setEditContent(item.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== item.content) {
      const newTitle = trimmed.substring(0, 50);
      onSave(trimmed, newTitle);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(item.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    // Cancel on Escape
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // Auto-save on blur (click away)
  const handleBlur = () => {
    if (isEditing) {
      handleSave();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative border-b border-base py-3 px-4 hover:bg-element-hover/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-muted hover:text-main cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        {/* Insert After Button */}
        <button
          onClick={onInsertAfter}
          className="flex-shrink-0 p-1 text-muted hover:text-primary hover:bg-element rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Insert command below"
        >
          <Plus size={14} />
        </button>

        {/* Usage Count Badge */}
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted min-w-[2.5rem]">
          <Hash size={12} />
          <span className="font-mono">{item.usageCount}</span>
        </div>

        {/* Command Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="w-full bg-surface border border-focus rounded px-2 py-1 text-sm font-mono text-main resize-none outline-none"
              rows={1}
            />
          ) : (
            <div
              onClick={handleEdit}
              className="text-sm font-mono text-main cursor-text whitespace-pre-wrap break-words"
            >
              {item.content}
            </div>
          )}

          {/* Labels */}
          {item.labels.length > 0 && !isEditing && (
            <div className="flex items-center gap-1.5 mt-2">
              {item.labels.map((label) => (
                <span
                  key={label}
                  className="text-xs text-secondary px-1.5 py-0.5 bg-element rounded"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  handleSave();
                }}
                className="p-1.5 text-success hover:bg-success-subtle rounded transition-colors"
                title="Save (Enter)"
              >
                <Check size={16} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  handleCancel();
                }}
                className="p-1.5 text-secondary hover:bg-element-hover rounded transition-colors"
                title="Cancel (Esc)"
              >
                <X size={16} />
              </button>
            </>
          ) : showDeleteConfirm ? (
            <>
              <span className="text-xs text-danger mr-1">Delete?</span>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1.5 text-secondary hover:bg-element-hover rounded transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-danger hover:bg-danger-subtle rounded transition-colors"
                title="Confirm delete"
              >
                <Check size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCopy}
                className={`p-1.5 rounded transition-colors ${
                  isCopied
                    ? "text-success"
                    : "text-secondary hover:bg-element-hover"
                }`}
                title="Copy to clipboard"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={onOpenInScratchpad}
                className="p-1.5 text-secondary hover:bg-element-hover rounded transition-colors"
                title="Open in scratchpad"
              >
                <FileEdit size={16} />
              </button>
              <button
                onClick={handleEdit}
                className="p-1.5 text-secondary hover:bg-element-hover rounded transition-colors"
                title="Edit command"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-secondary hover:bg-element-hover hover:text-danger rounded transition-colors"
                title="Delete command"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
