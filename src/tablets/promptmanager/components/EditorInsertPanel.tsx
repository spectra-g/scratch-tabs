import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { Snippet } from "../types";
import { MarkdownPreview } from "./MarkdownPreview";

interface EditorInsertPanelProps {
  snippets: Snippet[];
  onInsert: (content: string) => void;
}

export const EditorInsertPanel: React.FC<EditorInsertPanelProps> = ({
  snippets,
  onInsert,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items based on search query
  const filteredSnippets = snippets.filter((snippet) => {
    if (!searchQuery) return true;

    return (
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group items by category
  const groupedSnippets = filteredSnippets.reduce(
    (acc, snippet) => {
      if (!acc[snippet.category]) {
        acc[snippet.category] = [];
      }
      acc[snippet.category].push(snippet);
      return acc;
    },
    {} as Record<string, Snippet[]>,
  );

  const handleInsert = (content: string) => {
    onInsert(content);
  };

  return (
    <div className="h-full flex flex-col bg-gray-800/50 border-l border-gray-700/50">
      {/* Header */}
      <div className="flex-none p-3 border-b border-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">
          Insert Snippet
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md pl-8 pr-8 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {Object.entries(groupedSnippets).length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? "No snippets found" : "No snippets available"}
          </div>
        ) : (
          Object.entries(groupedSnippets).map(([category, snippets]) => (
            <div key={category}>
              <div className="px-3 py-2 bg-gray-700/30 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {category}
              </div>
              <div>
                {snippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="p-3 border-b border-gray-700/30 cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => handleInsert(snippet.content)}
                  >
                    <div className="font-medium text-sm text-gray-200 mb-1">
                      {snippet.title}
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
                      <MarkdownPreview
                        content={snippet.content}
                        className="prose prose-invert prose-xs max-w-none text-gray-400 [&>h1]:text-xs [&>h2]:text-xs [&>h3]:text-xs [&>h4]:text-xs [&>h5]:text-xs [&>h6]:text-xs [&>p]:text-xs [&>ul]:text-xs [&>ol]:text-xs [&>li]:text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
