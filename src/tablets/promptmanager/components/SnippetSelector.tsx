import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Snippet } from "../types";

interface SnippetSelectorProps {
  snippets: Snippet[];
  onSelectSnippet: (content: string) => void;
  onClose: () => void;
}

export const SnippetSelector: React.FC<SnippetSelectorProps> = ({
  snippets,
  onSelectSnippet,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter snippets based on search query
  const filteredSnippets = snippets.filter((snippet) => {
    if (!searchQuery) return true;

    return (
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Group snippets by category
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSnippets.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSnippets[selectedIndex]) {
          onSelectSnippet(filteredSnippets[selectedIndex].content);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredSnippets, selectedIndex, onSelectSnippet, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredSnippets.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredSnippets.length]);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-40 w-80 max-h-[400px] flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-2 border-b border-gray-700">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md pl-8 pr-8 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
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

        {/* Snippet List */}
        <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar">
          {Object.entries(groupedSnippets).length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No snippets found
            </div>
          ) : (
            Object.entries(groupedSnippets).map(([category, snippets]) => (
              <div key={category}>
                <div className="px-3 py-1.5 bg-gray-700/30 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {category}
                </div>
                <div>
                  {snippets.map((snippet, index) => {
                    const globalIndex = filteredSnippets.findIndex(
                      (s) => s.id === snippet.id,
                    );
                    return (
                      <div
                        key={snippet.id}
                        data-index={globalIndex}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
                          globalIndex === selectedIndex ? "bg-gray-700/70" : ""
                        }`}
                        onClick={() => onSelectSnippet(snippet.content)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="font-medium text-sm text-gray-200">
                          {snippet.title}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                          {snippet.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
