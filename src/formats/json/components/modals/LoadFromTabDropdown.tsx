import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, FileJson, Upload } from "lucide-react";
import { Tab } from "../../../../types";

interface LoadFromTabDropdownProps {
  recentJsonTabs: Tab[];
  onLoadFromTab: (tabId: string) => void;
}

/**
 * Dropdown component for loading JSON content from other tabs
 * into the target editor of the equality check modal.
 */
export const LoadFromTabDropdown: React.FC<LoadFromTabDropdownProps> = ({
  recentJsonTabs,
  onLoadFromTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleTabSelect = (tabId: string) => {
    onLoadFromTab(tabId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Load From Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-xs"
        title="Load JSON from another tab"
      >
        <Upload size={12} />
        <span>Load from</span>
        <ChevronDown
          size={10}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
          {recentJsonTabs.length > 0 ? (
            <div className="overflow-y-auto custom-scrollbar">
              {recentJsonTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                  title={`Load from ${tab.title}`}
                >
                  <FileJson size={14} className="text-green-400 flex-shrink-0" />
                  <span className="truncate">{tab.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">
              No other JSON tabs available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
