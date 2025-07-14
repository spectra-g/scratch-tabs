import React, { useState } from "react";
import {
  Plus,
  Star,
  Copy,
  Trash2,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Prompt, Tag } from "../types";
import { estimateTokenCount, formatTokenCount, getTokenCountColor } from "../utils/tokenCount";

interface PromptListProps {
  prompts: Prompt[];
  selectedPromptId: string | null;
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: (
    prompt: Omit<Prompt, "id" | "createdAt" | "lastModified" | "usageCount">,
  ) => Prompt;
  onDeletePrompt: (id: string) => void;
  onClonePrompt: (id: string) => Prompt | undefined;
  onToggleFavorite: (id: string) => void;
  onStartFromTemplate: () => void;
  viewMode: "list" | "grid";
  onViewModeChange: () => void;
  sortBy: "title" | "createdAt" | "lastModified" | "usageCount";
  sortDirection: "asc" | "desc";
  onSortChange: (
    sortBy: "title" | "createdAt" | "lastModified" | "usageCount",
  ) => void;
  onSortDirectionChange: () => void;
  tags: Tag[];
}

export const PromptList: React.FC<PromptListProps> = ({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  onCreatePrompt,
  onDeletePrompt,
  onClonePrompt,
  onToggleFavorite,
  onStartFromTemplate,
  viewMode,
  onViewModeChange,
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  tags,
}) => {
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showNewPromptMenu, setShowNewPromptMenu] = useState(false);

  const handleCreatePrompt = () => {
    onCreatePrompt({
      title: "Untitled Prompt",
      content: "",
      tags: [],
      isFavorite: false,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTagsForPrompt = (prompt: Prompt) => {
    return prompt.tags
      .map((tagId) => tags.find((tag) => tag.id === tagId))
      .filter(Boolean) as Tag[];
  };

  return (
    <div className="w-80 border-r border-gray-700/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-200">Prompts</h2>
          <div className="flex items-center space-x-1">
            <button
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
              onClick={onViewModeChange}
              title={
                viewMode === "list"
                  ? "Switch to grid view"
                  : "Switch to list view"
              }
            >
              {viewMode === "list" ? <Grid size={16} /> : <List size={16} />}
            </button>

            <div className="relative">
              <button
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                onClick={() => setShowSortOptions(!showSortOptions)}
                title="Sort options"
              >
                {sortDirection === "asc" ? (
                  <SortAsc size={16} />
                ) : (
                  <SortDesc size={16} />
                )}
              </button>

              {showSortOptions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSortOptions(false)}
                  />
                  <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[180px]">
                    <div className="py-1">
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === "title" ? "text-blue-400" : "text-gray-300"
                        }`}
                        onClick={() => {
                          onSortChange("title");
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Title</span>
                        {sortBy === "title" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          ))}
                      </button>
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === "createdAt"
                            ? "text-blue-400"
                            : "text-gray-300"
                        }`}
                        onClick={() => {
                          onSortChange("createdAt");
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Date Created</span>
                        {sortBy === "createdAt" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          ))}
                      </button>
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === "lastModified"
                            ? "text-blue-400"
                            : "text-gray-300"
                        }`}
                        onClick={() => {
                          onSortChange("lastModified");
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Last Modified</span>
                        {sortBy === "lastModified" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          ))}
                      </button>
                      <button
                        className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                          sortBy === "usageCount"
                            ? "text-blue-400"
                            : "text-gray-300"
                        }`}
                        onClick={() => {
                          onSortChange("usageCount");
                          setShowSortOptions(false);
                        }}
                      >
                        <span>Usage Count</span>
                        {sortBy === "usageCount" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          ))}
                      </button>
                      <div className="border-t border-gray-700 my-1"></div>
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors text-gray-300"
                        onClick={() => {
                          onSortDirectionChange();
                          setShowSortOptions(false);
                        }}
                      >
                        <span>
                          {sortDirection === "asc"
                            ? "Descending Order"
                            : "Ascending Order"}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors"
            onClick={() => setShowNewPromptMenu(!showNewPromptMenu)}
          >
            <Plus size={16} />
            <span>New Prompt</span>
          </button>
          {showNewPromptMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNewPromptMenu(false)}
              />
              <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[180px]">
                <div className="py-1">
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      handleCreatePrompt();
                      setShowNewPromptMenu(false);
                    }}
                  >
                    Start from Blank
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      onStartFromTemplate();
                      setShowNewPromptMenu(false);
                    }}
                  >
                    Start from Template
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prompt List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <p className="text-center mb-2">No prompts found</p>
            <button
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors text-sm"
              onClick={handleCreatePrompt}
            >
              Create your first prompt
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === "list"
                ? "divide-y divide-gray-700/50"
                : "p-2 grid gap-2"
            }
          >
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`group ${
                  viewMode === "list"
                    ? "hover:bg-gray-800/50 transition-colors"
                    : "bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                } ${selectedPromptId === prompt.id ? "bg-gray-800" : ""}`}
              >
                <div
                  className={`cursor-pointer ${viewMode === "list" ? "p-3" : "p-3"}`}
                  onClick={() => onSelectPrompt(prompt.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-200 truncate">
                      {prompt.title}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <button
                        className={`p-1 rounded ${
                          prompt.isFavorite
                            ? "text-yellow-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(prompt.id);
                        }}
                        title={
                          prompt.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                      >
                        <Star
                          size={14}
                          className={prompt.isFavorite ? "fill-yellow-400" : ""}
                        />
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClonePrompt(prompt.id);
                        }}
                        title="Clone prompt"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePrompt(prompt.id);
                        }}
                        title="Delete prompt"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {getTagsForPrompt(prompt).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  {viewMode === "grid" && (
                    <div className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {prompt.content || <em>No content</em>}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <div className="flex items-center space-x-2">
                      <span>{formatDate(prompt.lastModified)}</span>
                      <span className={getTokenCountColor(estimateTokenCount(prompt.content))}>
                        {formatTokenCount(estimateTokenCount(prompt.content))}
                      </span>
                    </div>
                    <span>
                      {prompt.usageCount}{" "}
                      {prompt.usageCount === 1 ? "use" : "uses"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
