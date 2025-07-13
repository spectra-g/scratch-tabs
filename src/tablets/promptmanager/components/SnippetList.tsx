import React, { useState } from "react";
import { Plus, Copy, Trash2, Edit2, Check } from "lucide-react";
import { Snippet, Template } from "../types";
import { ContentItemEditorModal } from "./ContentItemEditorModal";
import { SnippetDetailModal } from './SnippetDetailModal';

interface SnippetListProps {
  snippets: Snippet[];
  selectedSnippetId: string | null;
  onSelectSnippet: (id: string) => void;
  onCreateSnippet: (snippet: Omit<Snippet, "id">) => Snippet;
  onUpdateSnippet: (id: string, updates: Partial<Omit<Snippet, "id">>) => void;
  onDeleteSnippet: (id: string) => void;
}

export const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  selectedSnippetId,
  onSelectSnippet,
  onCreateSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingSnippet, setViewingSnippet] = useState<Snippet | null>(null);
  
  // Group snippets by category
  const groupedSnippets = snippets.reduce(
    (acc, snippet) => {
      if (!acc[snippet.category]) {
        acc[snippet.category] = [];
      }
      acc[snippet.category].push(snippet);
      return acc;
    },
    {} as Record<string, Snippet[]>,
  );

  // Sort categories with "Custom" at the end
  const sortedCategories = Object.keys(groupedSnippets).sort((a, b) => {
    if (a === "Custom") return 1;
    if (b === "Custom") return -1;
    return a.localeCompare(b);
  });

  const handleSaveSnippet = (
    item: Omit<Snippet, "id"> | Omit<Template, "id">,
  ) => {
    if (editingSnippet) {
      onUpdateSnippet(editingSnippet.id, item as Omit<Snippet, "id">);
    } else {
      onCreateSnippet(item as Omit<Snippet, "id">);
    }
    setIsCreating(false);
    setEditingSnippet(null);
  };

  const handleCopySnippet = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);

    setTimeout(() => {
      setCopied(null);
    }, 2000);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-3 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-200">Snippets</h2>
            <button
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
              onClick={() => setIsCreating(true)}
              title="Create new snippet"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Snippet List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {sortedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <p className="text-center mb-2">No snippets found</p>
              <button
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors text-sm"
                onClick={() => setIsCreating(true)}
              >
                Create your first snippet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupedSnippets[category].map((snippet) => (
                      <div
                        key={snippet.id}
                        className={`bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 transition-colors cursor-pointer group ${
                          selectedSnippetId === snippet.id ? 'ring-1 ring-blue-500/50' : ''
                        }`}
                        onClick={() => {
                          onSelectSnippet(snippet.id);
                          setViewingSnippet(snippet);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-200">
                            {snippet.title}
                          </h4>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySnippet(snippet.id, snippet.content);
                              }}
                              title="Copy snippet"
                            >
                              {copied === snippet.id ? (
                                <Check size={14} className="text-green-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            {!snippet.isBuiltIn && (
                              <>
                                <button
                                  className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSnippet(snippet);
                                  }}
                                  title="Edit snippet"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSnippet(snippet.id);
                                  }}
                                  title="Delete snippet"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 line-clamp-3 font-mono">
                          {snippet.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {(isCreating || editingSnippet) && (
        <ContentItemEditorModal
          item={editingSnippet}
          onSave={handleSaveSnippet}
          onClose={() => {
            setIsCreating(false);
            setEditingSnippet(null);
          }}
          itemType="Snippet"
        />
      )}
      {viewingSnippet && (
        <SnippetDetailModal
          snippet={viewingSnippet}
          onClose={() => setViewingSnippet(null)}
        />
      )}
    </>
  );
};
