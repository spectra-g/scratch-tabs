import React, { useState, useRef, useEffect } from "react";
import { Plus, Upload } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { VaultItem } from "../types";
import { CommandBlock } from "./CommandBlock";

interface VaultCanvasProps {
  items: VaultItem[];
  selectedCategory: string | null;
  onAddItem: (content: string, category: string | null, insertAfterId?: string | null) => void;
  onCopyItem: (id: string) => void;
  onOpenInScratchpad: (id: string) => void;
  onUpdateItem: (id: string, content: string, title: string) => void;
  onDeleteItem: (id: string) => void;
  onReorder: (itemIds: string[]) => void;
  onImport: () => void;
  copiedItemId: string | null;
}

export const VaultCanvas: React.FC<VaultCanvasProps> = ({
  items,
  selectedCategory,
  onAddItem,
  onCopyItem,
  onOpenInScratchpad,
  onUpdateItem,
  onDeleteItem,
  onReorder,
  onImport,
  copiedItemId,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCommandContent, setNewCommandContent] = useState("");
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter items by selected category
  const filteredItems = selectedCategory
    ? items.filter((item) => item.labels.includes(selectedCategory))
    : items;

  // Sort by order field (ascending)
  const sortedItems = [...filteredItems].sort((a, b) => a.order - b.order);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
      const newIndex = sortedItems.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(sortedItems, oldIndex, newIndex);
      onReorder(reorderedItems.map((item) => item.id));
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isAddingNew) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.focus();
    }
  }, [isAddingNew, newCommandContent]);

  const handleStartAdding = (afterId: string | null = null) => {
    setInsertAfterId(afterId);
    setIsAddingNew(true);
  };

  const handleCancelAdding = () => {
    setIsAddingNew(false);
    setNewCommandContent("");
    setInsertAfterId(null);
  };

  const handleSaveNew = () => {
    if (newCommandContent.trim()) {
      // Pass selectedCategory (or null) - handleAddItem will fallback to "General"
      onAddItem(newCommandContent.trim(), selectedCategory, insertAfterId);
      setNewCommandContent("");
      setIsAddingNew(false);
      setInsertAfterId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveNew();
    }
    // Cancel on Escape
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelAdding();
    }
  };

  const handleBlur = () => {
    if (newCommandContent.trim()) {
      // Has content - save it
      handleSaveNew();
    } else {
      // Empty - just cancel
      handleCancelAdding();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-base bg-surface">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-main">
              {selectedCategory || "All Commands"}
            </h2>
            <p className="text-sm text-secondary mt-1">
              {sortedItems.length} command{sortedItems.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Import Button */}
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 bg-element hover:bg-element-hover border border-base rounded-md text-sm text-main transition-colors"
          >
            <Upload size={16} />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Command List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedCategory ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-secondary text-sm max-w-md">
              <p className="mb-2">Select a category from the sidebar to view commands.</p>
              <p className="text-muted text-xs">
                Or press <kbd className="px-1.5 py-0.5 bg-element border border-base rounded text-xs">Ctrl+R</kbd> to search all commands
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* New Command Entry at TOP (Notable-style) */}
            <div className="border-b border-base">
              {isAddingNew && insertAfterId === null ? (
                <div className="px-4 py-3">
                  <textarea
                    ref={textareaRef}
                    value={newCommandContent}
                    onChange={(e) => setNewCommandContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Type your command... (Enter to save, Shift+Enter for new line, Esc to cancel)"
                    className="w-full bg-surface border border-focus rounded px-3 py-2 text-sm font-mono text-main placeholder-muted resize-none outline-none"
                    rows={1}
                  />
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                    <span>↵ Save</span>
                    <span>Shift+↵ New line</span>
                    <span>Esc Cancel</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleStartAdding(null)}
                  className="w-full px-4 py-3 text-left text-sm text-muted hover:text-main hover:bg-element-hover transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Add a command...</span>
                </button>
              )}
            </div>

            {sortedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="text-secondary text-sm">
                  <p className="mb-2">No commands yet. Start adding your favorite commands!</p>
                  <p className="text-muted text-xs">
                    Type a command above and press Enter to save.
                  </p>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <CommandBlock
                        item={item}
                        onCopy={() => onCopyItem(item.id)}
                        onOpenInScratchpad={() => onOpenInScratchpad(item.id)}
                        onSave={(content, title) => onUpdateItem(item.id, content, title)}
                        onDelete={() => onDeleteItem(item.id)}
                        onInsertAfter={() => handleStartAdding(item.id)}
                        isCopied={copiedItemId === item.id}
                      />
                      {/* Inline insert input */}
                      {isAddingNew && insertAfterId === item.id && (
                        <div className="px-4 py-3 border-b border-base bg-surface-secondary">
                          <textarea
                            ref={textareaRef}
                            value={newCommandContent}
                            onChange={(e) => setNewCommandContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            placeholder="Type your command... (Enter to save, Shift+Enter for new line, Esc to cancel)"
                            className="w-full bg-surface border border-focus rounded px-3 py-2 text-sm font-mono text-main placeholder-muted resize-none outline-none"
                            rows={1}
                          />
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                            <span>↵ Save</span>
                            <span>Shift+↵ New line</span>
                            <span>Esc Cancel</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </div>
    </div>
  );
};
