import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Clipboard, FileJson, GitCompare } from "lucide-react";
import { Tab } from "../../../../types";

interface CompareDropdownProps {
  recentJsonTabs: Tab[];
  onCompareWithClipboard: () => void;
  onCompareWithTab: (tabId: string) => void;
  onCompareStructure: () => void;
}

export const CompareDropdown: React.FC<CompareDropdownProps> = ({
  recentJsonTabs,
  onCompareWithClipboard,
  onCompareWithTab,
  onCompareStructure,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleOptionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compare Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
        title="Compare options"
      >
        <GitCompare size={14} />
        <span className="text-sm">Compare</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
          <div className="py-1">
            {/* Compare with Clipboard */}
            <button
              onClick={() => handleOptionClick(onCompareWithClipboard)}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Clipboard size={16} className="text-blue-400" />
              <span>With clipboard</span>
            </button>

            {/* Separator if there are recent JSON tabs */}
            {recentJsonTabs.length > 0 && (
              <div className="border-t border-gray-700 my-1" />
            )}

            {/* Recent JSON Tabs */}
            {recentJsonTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleOptionClick(() => onCompareWithTab(tab.id))}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                title={`Compare with ${tab.title}`}
              >
                <FileJson size={16} className="text-green-400" />
                <span className="truncate">With {tab.title}</span>
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-700 my-1" />

            {/* Compare Structure */}
            <button
              onClick={() => handleOptionClick(onCompareStructure)}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <GitCompare size={16} className="text-purple-400" />
              <span>Compare Structure</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
