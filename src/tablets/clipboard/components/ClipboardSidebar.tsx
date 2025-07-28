import React from 'react';
import { 
  Clipboard, 
  Search, 
  X, 
  List, 
  Star, 
  ClipboardPaste, 
  Keyboard 
} from '../../../components/Icons';
import { ContentType, ClipboardFilters } from '../types';
import { ContentTypeIcon } from './ContentTypeIcon';

interface ClipboardSidebarProps {
  filters: ClipboardFilters;
  onUpdateFilters: (updates: Partial<ClipboardFilters>) => void;
  onPaste: () => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export const ClipboardSidebar: React.FC<ClipboardSidebarProps> = ({
  filters,
  onUpdateFilters,
  onPaste,
  onClose,
  isMobile = false,
}) => {
  const { searchQuery, filterType, showFavorites } = filters;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilters({ searchQuery: e.target.value });
  };

  const handleFilterTypeChange = (type: ContentType | null) => {
    onUpdateFilters({ filterType: type });
  };

  const handleToggleFavorites = () => {
    onUpdateFilters({ showFavorites: !showFavorites, filterType: null });
  };

  const handleShowAll = () => {
    onUpdateFilters({ filterType: null, showFavorites: false });
  };

  return (
    <div className="flex flex-col p-4 space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clipboard className="text-gray-400" size={20} />
          <h2 className="text-lg font-semibold text-gray-100">Clipboard</h2>
        </div>
        {isMobile && onClose && (
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-white"
            title="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="relative">
        <Search 
          size={16} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search clipboard..."
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Filters
          </h3>
          <div className="space-y-1">
            <button
              onClick={handleShowAll}
              className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${
                !filterType && !showFavorites 
                  ? "bg-blue-500/20 text-blue-300" 
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <List size={16} className="mr-2" />
              All Items
            </button>
            <button
              onClick={handleToggleFavorites}
              className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${
                showFavorites 
                  ? "bg-blue-500/20 text-blue-300" 
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Star size={16} className="mr-2" />
              Favorites
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Content Types
          </h3>
          <div className="space-y-1">
            {(["text", "image", "link", "color"] as ContentType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleFilterTypeChange(type)}
                className={`w-full flex items-center p-2 rounded-md text-sm transition-colors ${
                  filterType === type 
                    ? "bg-blue-500/20 text-blue-300" 
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <ContentTypeIcon type={type} size={16} />
                <span className="ml-2 capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2 flex-shrink-0">
        <button
          onClick={onPaste}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors text-sm"
        >
          <ClipboardPaste size={16} />
          <span>Paste from Clipboard</span>
        </button>
        <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
          <Keyboard size={14} />
          <span>Up/Down, Enter to copy, CTRL+V to paste.</span>
        </div>
      </div>
    </div>
  );
};