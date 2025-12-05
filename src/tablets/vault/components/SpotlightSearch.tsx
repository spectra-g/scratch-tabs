import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Hash, Clock, Copy } from "lucide-react";
import { VaultItem } from "../types";
import { getLabelIcon } from "../constants";

interface SpotlightSearchProps {
  items: VaultItem[];
  onClose: () => void;
  onSelect: (item: VaultItem) => void;
}

/**
 * Fuzzy search function - matches characters in order but allows gaps
 */
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let textIndex = 0;
  let queryIndex = 0;

  while (textIndex < lowerText.length && queryIndex < lowerQuery.length) {
    if (lowerText[textIndex] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === lowerQuery.length;
}

/**
 * Calculate match score for sorting (higher is better)
 */
function calculateMatchScore(item: VaultItem, query: string): number {
  if (!query) return item.usageCount;

  const lowerQuery = query.toLowerCase();
  const contentLower = item.content.toLowerCase();
  const titleLower = item.title.toLowerCase();

  let score = item.usageCount * 10; // Base score from usage

  // Exact content match gets highest boost
  if (contentLower === lowerQuery) score += 1000;
  // Content starts with query
  else if (contentLower.startsWith(lowerQuery)) score += 500;
  // Content includes query
  else if (contentLower.includes(lowerQuery)) score += 250;

  // Title matches
  if (titleLower.includes(lowerQuery)) score += 100;

  // Label matches
  if (item.labels.some(label => label.toLowerCase().includes(lowerQuery))) {
    score += 50;
  }

  return score;
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  items,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      // No query - just sort by usage count
      return [...items].sort((a, b) => b.usageCount - a.usageCount);
    }

    // Filter items that fuzzy match the query
    const matched = items.filter(
      (item) =>
        fuzzyMatch(item.content, searchQuery) ||
        fuzzyMatch(item.title, searchQuery) ||
        item.labels.some((label) => fuzzyMatch(label, searchQuery))
    );

    // Sort by match score (includes usage count)
    return matched.sort((a, b) => {
      const scoreA = calculateMatchScore(a, searchQuery);
      const scoreB = calculateMatchScore(b, searchQuery);
      return scoreB - scoreA;
    });
  }, [items, searchQuery]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredItems.length - 1)
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleItemClick = (item: VaultItem) => {
    onSelect(item);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-canvas/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-base rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-base px-4 py-3">
          <Search size={20} className="text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands... (Ctrl+R)"
            className="flex-1 ml-3 bg-transparent text-main placeholder-muted outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const IconComponent = item.labels[0]
                ? getLabelIcon(item.labels[0])
                : Copy;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-center px-4 py-3 border-b border-base cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-element-active"
                      : "hover:bg-element-hover"
                  }`}
                >
                  {/* Icon */}
                  <IconComponent size={18} className="text-secondary flex-shrink-0 mr-3" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-main truncate">
                      {item.content}
                    </div>
                    {item.labels.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
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

                  {/* Usage Stats */}
                  <div className="flex items-center gap-3 ml-4 text-xs text-muted flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Hash size={12} />
                      {item.usageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.lastUsedTimestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-secondary">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>No commands found</p>
              {searchQuery && (
                <p className="text-sm mt-1 text-muted">
                  Try a different search term
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-base flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div>{filteredItems.length} results</div>
        </div>
      </div>
    </div>
  );
};
