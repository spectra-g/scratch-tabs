import React, { useState, useEffect } from "react";
import { X, Eye, Code } from "lucide-react";
import { Template, Snippet } from "../types";
import { FormattingToolbar } from "./FormattingToolbar";
import { MarkdownPreview } from "./MarkdownPreview";
import { estimateTokenCount, formatTokenCount, getTokenCountColor } from "../utils/tokenCount";

type Item = Omit<Template, "id"> | Omit<Snippet, "id">;

interface ContentItemEditorModalProps {
  item: Item | null;
  onSave: (item: Item) => void;
  onClose: () => void;
  itemType: "Template" | "Snippet";
}

export const ContentItemEditorModal: React.FC<ContentItemEditorModalProps> = ({
  item,
  onSave,
  onClose,
  itemType,
}) => {
  const [editedItem, setEditedItem] = useState<Item>({
    title: "",
    content: "",
    category: "Custom",
    description: "",
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (item) {
      setEditedItem(item);
    } else {
      setEditedItem({
        title: "",
        content: "",
        category: "Custom",
        description: "",
      });
    }
  }, [item]);

  const handleSave = () => {
    if (editedItem.title.trim()) {
      onSave(editedItem);
    }
  };

  const handleFormat = (markdown: string) => {
    // This is a placeholder for the markdown formatting logic
    // A more complete implementation would manipulate the content in the textarea
    setEditedItem({ ...editedItem, content: editedItem.content + markdown });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">
            {item ? `Edit ${itemType}` : `New ${itemType}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editedItem.title}
              onChange={(e) =>
                setEditedItem({ ...editedItem, title: e.target.value })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {itemType === "Template" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={(editedItem as Template).description || ""}
                onChange={(e) =>
                  setEditedItem({ ...editedItem, description: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={editedItem.category}
              onChange={(e) =>
                setEditedItem({ ...editedItem, category: e.target.value })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Content
            </label>
            <div className="border border-gray-600 rounded-md">
              <FormattingToolbar onFormat={handleFormat} />
              <div
                className={
                  showPreview ? "grid grid-cols-2 gap-px bg-gray-600" : ""
                }
              >
                <textarea
                  value={editedItem.content}
                  onChange={(e) =>
                    setEditedItem({ ...editedItem, content: e.target.value })
                  }
                  rows={15}
                  className={`w-full bg-gray-900 p-2 text-white focus:outline-none resize-none ${showPreview ? "rounded-bl-md" : "rounded-b-md"}`}
                />
                {showPreview && (
                  <div className="bg-gray-900 p-2 overflow-y-auto rounded-br-md">
                    <MarkdownPreview content={editedItem.content} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white"
            >
              {showPreview ? <Code size={16} /> : <Eye size={16} />}
              <span>{showPreview ? "Editor" : "Preview"}</span>
            </button>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-400">Token Count:</span>
              <span className={getTokenCountColor(estimateTokenCount(editedItem.content))}>
                {formatTokenCount(estimateTokenCount(editedItem.content))}
              </span>
            </div>
          </div>
          <div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 rounded-md hover:bg-gray-700 mr-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
              disabled={!editedItem.title.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
