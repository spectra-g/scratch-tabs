import React, { useState, useEffect, useRef } from 'react';
import { tabletRegistry } from '../registry';
import { Tablet } from '../types';
import { Search } from 'lucide-react';

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
  showSearch = false
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [tablets, setTablets] = useState<Tablet[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Update search results when query changes
  useEffect(() => {
    setTablets(tabletRegistry.search(searchQuery));
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
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, tablets.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (tablets[selectedIndex]) {
            onSelect(tablets[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    // Use capture phase to intercept events before they reach the editor
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [tablets, selectedIndex, onSelect, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  return (
    <div 
      ref={selectorRef}
      className="absolute z-50 w-72 bg-gray-800/95 backdrop-blur border border-gray-600/50 rounded-lg shadow-xl"
    >
      {showSearch && (
        <div className="p-2 border-b border-gray-600/50">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tablets..."
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-400"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>
        </div>
      )}

      {tablets.length > 0 ? (
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto custom-scrollbar"
        >
          {tablets.map((tablet, index) => (
            <div
              key={tablet.id}
              className={`p-3 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-500/20 border-l-2 border-blue-500'
                  : 'hover:bg-gray-700/50 border-l-2 border-transparent'
              }`}
              onClick={() => onSelect(tablet)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="font-medium text-gray-100">{tablet.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {tablet.keywords.join(', ')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-300 text-sm p-2">
          No tablets found
        </div>
      )}
    </div>
  );
};