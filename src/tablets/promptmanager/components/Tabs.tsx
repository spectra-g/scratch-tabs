import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  FileUp,
  Menu,
  SlidersHorizontal,
} from "lucide-react";

interface TabsProps {
  activeTab: "prompts" | "templates" | "snippets" | "workflows";
  onTabChange: (
    tab: "prompts" | "templates" | "snippets" | "workflows",
  ) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onImportExport: () => void;
  onMobileMenuToggle: () => void;
  showFiltersPanel: boolean;
  onToggleFiltersPanel: () => void;
}

export const Tabs: React.FC<TabsProps> = ({
  activeTab,
  onTabChange,
  onSearch,
  searchQuery,
  onImportExport,
  onMobileMenuToggle,
  showFiltersPanel,
  onToggleFiltersPanel,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when pressing Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50">
      <div className="flex items-center space-x-2">
        <button
          className="md:hidden p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center space-x-1">
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "prompts"
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={() => onTabChange("prompts")}
          >
            Prompts
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "templates"
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={() => onTabChange("templates")}
          >
            Templates
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "snippets"
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={() => onTabChange("snippets")}
          >
            Snippets
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "workflows"
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
            }`}
            onClick={() => onTabChange("workflows")}
          >
            Workflows
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Search */}
        <div
          className={`relative ${isSearchFocused ? "w-64" : "w-48"} transition-all duration-200`}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md pl-8 pr-8 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Panel Toggle */}
        <button
          onClick={onToggleFiltersPanel}
          className={`p-2 rounded-md transition-colors ${
            showFiltersPanel
              ? "text-blue-400 bg-blue-500/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          }`}
          title={showFiltersPanel ? "Hide Filters Panel" : "Show Filters Panel"}
        >
          <SlidersHorizontal size={18} />
        </button>

        {/* Import/Export */}
        <button
          onClick={onImportExport}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md"
          title="Import/Export"
        >
          <FileUp size={18} />
        </button>
      </div>
    </div>
  );
};
