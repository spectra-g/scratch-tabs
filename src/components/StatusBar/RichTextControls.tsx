import React, { useState, useRef, useEffect } from 'react';
import { Palette, Grid, FileText } from '../Icons';
import { useRootStore } from '../../stores/rootStore';
import { Tab } from '../../types';

interface RichTextControlsProps {
  activeTab: Tab;
}

export const RichTextControls: React.FC<RichTextControlsProps> = ({
  activeTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { updateTabState } = useRootStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTextureChange = (texture: 'paper' | 'grid' | null) => {
    updateTabState(activeTab.id, { backgroundTexture: texture });
    setIsOpen(false);
  };

  const handleToggleRichMode = () => {
    updateTabState(activeTab.id, { 
      isRich: !activeTab.isRich,
      lastModified: Date.now(),
    });
    setIsOpen(false);
  };

  const getCurrentTextureIcon = () => {
    switch (activeTab.backgroundTexture) {
      case 'paper':
        return <FileText size={12} />;
      case 'grid':
        return <Grid size={12} />;
      default:
        return <Palette size={12} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors group"
        title="Rich Text Options"
      >
        {getCurrentTextureIcon()}
        <span className="text-xs text-gray-300">
          {activeTab.isRich ? 'Rich' : 'Text'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[180px]">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-300">Editor Mode</span>
          </div>

          {/* Mode Toggle */}
          <div className="px-3 py-2 border-b border-gray-700">
            <button
              onClick={handleToggleRichMode}
              className="w-full flex items-center justify-between text-xs text-gray-300 hover:text-gray-100 transition-colors"
            >
              <span>{activeTab.isRich ? 'Switch to Plain Text' : 'Switch to Rich Text'}</span>
              <FileText size={12} />
            </button>
          </div>

          {/* Background Textures (only for rich text mode) */}
          {activeTab.isRich && (
            <>
              <div className="px-3 py-2 border-b border-gray-700">
                <span className="text-xs font-medium text-gray-300">Background</span>
              </div>

              <div className="px-3 py-2">
                <div className="space-y-1">
                  <button
                    onClick={() => handleTextureChange(null)}
                    className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
                      !activeTab.backgroundTexture
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <span>None</span>
                  </button>
                  
                  <button
                    onClick={() => handleTextureChange('paper')}
                    className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
                      activeTab.backgroundTexture === 'paper'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <span>Paper</span>
                    <FileText size={12} />
                  </button>
                  
                  <button
                    onClick={() => handleTextureChange('grid')}
                    className={`w-full flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
                      activeTab.backgroundTexture === 'grid'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <span>Grid</span>
                    <Grid size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};