import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Hash, Check } from "lucide-react";
import { VaultItem } from "../types";
import { getLabelIcon } from "../constants";

interface BottomSearchBarProps {
  items: VaultItem[];
  isOpen: boolean;
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

export const BottomSearchBar: React.FC<BottomSearchBarProps> = ({
  items,
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter and sort items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      // No query - just sort by usage count
      return [...items].sort((a, b) => b.usageCount - a.usageCount).slice(0, 10);
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
    }).slice(0, 10); // Limit to 10 results
  }, [items, searchQuery]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setShowCopiedFeedback(false);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
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
          setShowCopiedFeedback(true);
          onSelect(filteredItems[selectedIndex]);
          setTimeout(() => {
            setShowCopiedFeedback(false);
          }, 1500);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleItemClick = (item: VaultItem, index: number) => {
    setSelectedIndex(index);
    setShowCopiedFeedback(true);
    onSelect(item);
    setTimeout(() => {
      setShowCopiedFeedback(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="border-t border-base bg-surface-secondary">
      {/* Search Input */}
      <div className="flex items-center gap-2 px-4 py-2">
        <Search size={16} className="text-secondary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search commands... (Ctrl+R to close)"
          className="flex-1 bg-transparent text-sm text-main placeholder-muted outline-none"
        />
        {showCopiedFeedback && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check size={14} />
            Copied!
          </span>
        )}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Results */}
      {filteredItems.length > 0 && (
        <div
          ref={resultsRef}
          className="flex gap-2 px-4 pb-2 overflow-x-auto custom-scrollbar"
        >
          {filteredItems.map((item, index) => {
            const IconComponent = item.labels[0]
              ? getLabelIcon(item.labels[0])
              : Search;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item, index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border flex-shrink-0 transition-colors ${
                  index === selectedIndex
                    ? "border-focus bg-element-active text-main"
                    : "border-base bg-element hover:bg-element-hover text-secondary"
                }`}
              >
                <IconComponent size={14} className="flex-shrink-0" />
                <span className="text-sm font-mono whitespace-nowrap">
                  {item.content.length > 50
                    ? `${item.content.substring(0, 50)}...`
                    : item.content}
                </span>
                <span className="flex items-center gap-0.5 text-xs text-muted">
                  <Hash size={10} />
                  {item.usageCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Hints */}
      <div className="px-4 py-1 border-t border-base flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-3">
          <span>↑↓ Navigate</span>
          <span>↵ Copy & Show</span>
          <span>Esc Close</span>
        </div>
        <div>{filteredItems.length} results</div>
      </div>
    </div>
  );
};
