import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Clipboard, FileJson, GitCompare, CheckCheck } from "lucide-react";
import { Tab } from "../../../../types";

interface CompareDropdownProps {
  recentJsonTabs: Tab[];
  onCompareWithClipboard: () => void;
  onCompareWithTab: (tabId: string) => void;
  onCompareStructure: () => void;
  onEqualityCheck: () => void;
}

export const CompareDropdown: React.FC<CompareDropdownProps> = ({
  recentJsonTabs,
  onCompareWithClipboard,
  onCompareWithTab,
  onCompareStructure,
  onEqualityCheck,
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
        className="flex items-center space-x-1 px-3 py-1 bg-element hover:bg-element-hover text-secondary rounded transition-colors"
        title="Compare options"
      >
        <GitCompare size={14} />
        <span className="text-sm">Compare</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-base rounded shadow-lg z-50 max-h-96 flex flex-col">
          {/* Compare with Clipboard - Fixed at top */}
          <div className="py-1 border-b border-base">
            <button
              onClick={() => handleOptionClick(onCompareWithClipboard)}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-element-hover transition-colors"
            >
              <Clipboard size={16} className="text-info" />
              <span>With clipboard</span>
            </button>
          </div>

          {/* Scrollable JSON Tabs Section */}
          {recentJsonTabs.length > 0 && (
            <div className="overflow-y-auto max-h-60 py-1 custom-scrollbar">
              {recentJsonTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleOptionClick(() => onCompareWithTab(tab.id))}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-element-hover transition-colors"
                  title={`Compare with ${tab.title}`}
                >
                  <FileJson size={16} className="text-success flex-shrink-0" />
                  <span className="truncate">With {tab.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Compare Structure & Equality Check - Fixed at bottom */}
          <div className="py-1 border-t border-base">
            <button
              onClick={() => handleOptionClick(onCompareStructure)}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-element-hover transition-colors"
            >
              <GitCompare size={16} className="text-info" />
              <span>Compare Structure</span>
            </button>
            <button
              onClick={() => handleOptionClick(onEqualityCheck)}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-element-hover transition-colors"
            >
              <CheckCheck size={16} className="text-info" />
              <span>Deep Equality Check</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
