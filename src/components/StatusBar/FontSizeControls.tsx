import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Type } from '../../components/Icons';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useTabsStore } from '../../stores/tabsStore';
import { useRootStore } from '../../stores/rootStore';

interface FontSizeControlsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  isTablet: boolean;
  activeTabId: string | null;
}

export const FontSizeControls: React.FC<FontSizeControlsProps> = ({
  editor,
  isTablet,
  activeTabId,
}) => {
  // Don't render for tablet tabs - return early before hooks
  if (isTablet) {
    return null;
  }

  const { tabs } = useTabsStore();
  const { updateTabState } = useRootStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the active tab to determine current font size
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const currentFontSize = activeTab?.fontSize || 14;

  useEffect(() => {
    if (editor && activeTab) {
      // Apply the tab's font size to the editor
      editor.updateOptions({ fontSize: currentFontSize });
    }
  }, [editor, currentFontSize, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFontSizeChange = (newSize: number) => {
    if (editor && activeTab) {
      const clampedSize = Math.max(8, Math.min(24, newSize));
      editor.updateOptions({ fontSize: clampedSize });
      updateTabState(activeTab.id, { fontSize: clampedSize });
    }
  };

  const handleIncrease = () => {
    handleFontSizeChange(currentFontSize + 1);
  };

  const handleDecrease = () => {
    handleFontSizeChange(currentFontSize - 1);
  };

  const handleReset = () => {
    handleFontSizeChange(14);
  };

  const presetSizes = [10, 12, 14, 16, 18, 20];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Font Size Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors group"
        title="Font Size"
      >
        <Type size={12} className="text-gray-400 group-hover:text-gray-300" />
        <span className="text-xs font-mono text-gray-300">{currentFontSize}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[200px]">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-300">Font Size</span>
              <button
                onClick={handleReset}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="px-3 py-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <button
                onClick={handleDecrease}
                disabled={currentFontSize <= 8}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Decrease font size"
              >
                <Minus size={12} />
              </button>
              
              <span className="text-xs font-mono text-gray-300 px-2">
                {currentFontSize}px
              </span>
              
              <button
                onClick={handleIncrease}
                disabled={currentFontSize >= 24}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Increase font size"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Preset Sizes */}
          <div className="px-3 py-2">
            <div className="grid grid-cols-3 gap-1">
              {presetSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => handleFontSizeChange(size)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentFontSize === size
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 