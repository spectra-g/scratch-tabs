import React, { useState, useEffect, useRef } from 'react';
import { tabletRegistry } from '../registry';
import { Tablet } from '../types';

interface TabletSelectorProps {
  onSelect: (tablet: Tablet) => void;
  onClose: () => void;
  searchQuery: string;
}

export const TabletSelector: React.FC<TabletSelectorProps> = ({ 
  onSelect, 
  onClose,
  searchQuery 
}) => {
  const [tablets, setTablets] = useState<Tablet[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Update search results when query changes
  useEffect(() => {
    setTablets(tabletRegistry.search(searchQuery));
    setSelectedIndex(0);
  }, [searchQuery]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
  
  if (tablets.length === 0) {
    return (
      <div className="absolute z-50 w-72 bg-gray-800/95 backdrop-blur border border-gray-600/50 rounded-lg shadow-xl p-2">
        <div className="text-gray-300 text-sm p-2">
          No tablets found
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={listRef}
      className="absolute z-50 w-72 bg-gray-800/95 backdrop-blur border border-gray-600/50 rounded-lg shadow-xl max-h-72 overflow-y-auto"
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
  );
};