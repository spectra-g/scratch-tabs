import { useState } from "react";
import { ChevronDown, Code } from "lucide-react";
import { getSnippetsByCategory } from "../utils/snippets";

interface SnippetSelectorProps {
  selectedSnippet: string | null;
  onSnippetSelect: (snippetId: string) => void;
}

export function SnippetSelector({
  selectedSnippet,
  onSnippetSelect,
}: SnippetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const snippetsByCategory = getSnippetsByCategory();
  const categories = Object.keys(snippetsByCategory);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  const handleSnippetClick = (snippetId: string) => {
    onSnippetSelect(snippetId);
    setIsOpen(false);
  };

  const handleSnippetKeyDown = (e: React.KeyboardEvent, snippetId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSnippetClick(snippetId);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded-md hover:bg-gray-700/50 transition-colors text-sm"
      >
        <div className="flex items-center gap-2">
          <Code size={14} className="text-gray-400" />
          <span className="text-gray-300">
            {selectedSnippet
              ? snippetsByCategory[
                  Object.keys(snippetsByCategory).find((cat) =>
                    snippetsByCategory[cat].some(
                      (s) => s.id === selectedSnippet,
                    ),
                  ) || ""
                ]?.find((s) => s.id === selectedSnippet)?.name || "Quick Insert"
              : "Quick Insert"}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800/95 border border-gray-700/50 rounded-md shadow-lg backdrop-blur-sm z-50 max-h-80 overflow-y-auto custom-scrollbar">
          {categories.map((category) => (
            <div key={category}>
              <button
                onClick={() => handleCategorySelect(category)}
                className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-700/50 transition-colors border-b border-gray-700/30"
              >
                <span className="text-gray-200 font-medium text-sm">
                  {category}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-gray-400 transition-transform ${
                    selectedCategory === category ? "rotate-180" : ""
                  }`}
                />
              </button>

              {selectedCategory === category && (
                <div className="bg-gray-900/50">
                  {snippetsByCategory[category].map((snippet) => (
                    <button
                      key={snippet.id}
                      onClick={() => handleSnippetClick(snippet.id)}
                      onKeyDown={(e) => handleSnippetKeyDown(e, snippet.id)}
                      className={`w-full text-left p-3 hover:bg-gray-700/30 transition-colors border-l-2 ${
                        selectedSnippet === snippet.id
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-transparent"
                      }`}
                    >
                      <div className="text-gray-200 text-sm font-medium mb-1">
                        {snippet.name}
                      </div>
                      <div className="text-gray-400 text-xs mb-1 font-mono">
                        {snippet.pattern}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {snippet.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Clear Selection */}
          {selectedSnippet && (
            <div className="border-t border-gray-700/30">
              <button
                onClick={() => {
                  onSnippetSelect("");
                  setIsOpen(false);
                }}
                className="w-full p-2 text-left hover:bg-gray-700/50 transition-colors text-gray-400 text-sm"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
