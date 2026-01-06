import React, { useState, useEffect } from "react";
import { Archive, Hash, Plus, Trash2, Check, X } from "lucide-react";
import { getLabelIcon } from "../constants";

interface VaultSidebarCanvasProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  itemCounts: Record<string, number>;
}

export const VaultSidebarCanvas: React.FC<VaultSidebarCanvasProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  itemCounts,
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<string | null>(null);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  // Clear delete confirmation on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (deleteConfirmCategory) {
        setDeleteConfirmCategory(null);
      }
    };

    if (deleteConfirmCategory) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [deleteConfirmCategory]);

  return (
    <div className="tablet-sidebar w-72 overflow-y-auto custom-scrollbar h-full">
      {/* Header */}
      <div className="p-4 border-b border-base flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-main flex items-center gap-2">
          <Archive size={18} /> Command Vault
        </h2>
      </div>

      {/* Add Category Button */}
      <div className="px-2 pt-2">
        {isAddingCategory ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                } else if (e.key === "Escape") {
                  setNewCategoryName("");
                  setIsAddingCategory(false);
                }
              }}
              placeholder="Category name..."
              className="flex-1 bg-surface border border-focus rounded px-2 py-1 text-sm text-main outline-none"
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              className="p-1 text-success hover:bg-success-subtle rounded"
              title="Add category"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => {
                setNewCategoryName("");
                setIsAddingCategory(false);
              }}
              className="p-1 text-secondary hover:bg-element-hover rounded"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCategory(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-element hover:bg-element-hover border border-base rounded-md text-sm text-secondary transition-colors"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {categories.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-secondary">No categories yet</p>
            <p className="text-xs text-muted mt-1">
              Click "Add Category" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((category) => {
              const IconComponent = getLabelIcon(category);
              const count = itemCounts[category] || 0;
              const isConfirmingDelete = deleteConfirmCategory === category;

              return (
                <div
                  key={category}
                  className={`group flex items-center gap-1 rounded-md transition-colors ${selectedCategory === category
                    ? "bg-element-active"
                    : "hover:bg-element-hover"
                    }`}
                >
                  <button
                    onClick={() => onSelectCategory(category)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 text-sm ${selectedCategory === category
                      ? "text-main"
                      : "text-secondary"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent size={16} className="flex-shrink-0" />
                      <span className="truncate font-medium">{category}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted flex-shrink-0 ml-2">
                      <Hash size={12} />
                      {count}
                    </span>
                  </button>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1 pr-2">
                      <button
                        onClick={() => setDeleteConfirmCategory(null)}
                        className="p-1 text-secondary hover:bg-element-hover rounded"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => {
                          onDeleteCategory(category);
                          setDeleteConfirmCategory(null);
                        }}
                        className="p-1 text-danger hover:bg-danger-subtle rounded"
                        title="Confirm delete"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmCategory(category);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 mr-2 text-secondary hover:text-danger hover:bg-element-hover rounded transition-opacity"
                      title="Delete category"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-4 py-3 border-t border-base">
        <div className="text-xs text-muted">
          <p>Press <kbd className="px-1.5 py-0.5 bg-element border border-base rounded">Ctrl+R</kbd> to search</p>
        </div>
      </div>
    </div>
  );
};
