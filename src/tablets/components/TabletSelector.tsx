import React, { useState, useEffect, useRef } from "react";
import { dynamicTabletRegistry as tabletRegistry } from "../dynamicRegistry";
import { Tablet } from "../types";
import { TabletMetadata } from "../tabletMetadata";
import { Search } from "lucide-react";

interface TabletSelectorProps {
  onSelect: (tablet: Tablet) => void;
  onClose: () => void;
  searchQuery: string;
  showSearch?: boolean;
}

export const TabletSelector: React.FC<TabletSelectorProps> = ({
  onSelect,
  onClose,
  searchQuery: initialQuery,
  showSearch = false,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [tablets, setTablets] = useState<TabletMetadata[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update search results when query changes
  useEffect(() => {
    const updateResults = () => {
      setIsLoading(true);
      try {
        // Use metadata-based search (fast, no loading required)
        const results = tabletRegistry.search(searchQuery);
        setTablets(results);
      } catch (error) {
        console.error("Error searching tablets:", error);
        setTablets([]);
      } finally {
        setIsLoading(false);
      }
    };

    updateResults();
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Stop event propagation to prevent Monaco Editor from handling these keys
      e.stopPropagation();

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, tablets.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (tablets[selectedIndex]) {
            handleTabletSelect(tablets[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    // Use capture phase to intercept events before they reach the editor
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [tablets, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.children;
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle tablet selection (loads implementation on demand)
  const handleTabletSelect = async (tabletMetadata: TabletMetadata) => {
    try {
      // Load the full tablet implementation
      const tablet = await tabletRegistry.getById(tabletMetadata.id);
      if (tablet) {
        onSelect(tablet);
        // Close the selector immediately after selection
        onClose();
      } else {
        console.error(
          `❌ TabletSelector: Failed to load tablet: ${tabletMetadata.id}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ TabletSelector: Error loading tablet ${tabletMetadata.id}:`,
        error,
      );
    }
  };

  return (
    <div
      ref={selectorRef}
      className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-96 md:w-[600px] lg:w-[700px] max-h-96 md:max-h-[500px] lg:max-h-[600px] overflow-hidden"
    >
      {/* Search Input */}
      {showSearch && (
        <div className="p-3 border-b border-gray-700">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tablets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Tablet List */}
      <div
        ref={listRef}
        className="max-h-80 md:max-h-[420px] lg:max-h-[520px] overflow-y-auto custom-scrollbar"
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            Loading tablets...
          </div>
        ) : tablets.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No tablets found</div>
        ) : (
          tablets.map((tablet, index) => (
            <div
              key={tablet.id}
              className={`px-4 py-4 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? "bg-blue-500/20 text-blue-200"
                  : "text-gray-200 hover:bg-gray-700/50"
              }`}
              onClick={() => handleTabletSelect(tablet)}
            >
              <div className="flex flex-col">
                <div className="font-medium text-base">{tablet.label}</div>
                <div className="text-sm text-gray-400 mt-2">
                  {tablet.keywords.join(" • ")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
