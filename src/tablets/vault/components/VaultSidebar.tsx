import React from 'react';
import { Archive, Search, Plus, Tag, FileCode, Filter, SortDesc, Pin, SortAsc, Clock, Hash, Star, X, Upload } from 'lucide-react';
import { ContentType, SortOrder } from '../types';
import { getContentTypeIcon } from '../utils/contentTypeUtils';

interface VaultSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddItem: () => void;
  onImportItems: () => void;
  allLabels: string[];
  allContentTypes: ContentType[];
  activeFilters: {
    labels: string[];
    contentType: ContentType | null;
    showPinnedOnly: boolean;
  };
  onFilterByLabel: (label: string) => void;
  onFilterByContentType: (contentType: ContentType | null) => void;
  onTogglePinnedFilter: () => void;
  onClearFilters: () => void;
  sortOrder: SortOrder;
  onChangeSortOrder: (sortOrder: SortOrder) => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  searchQuery,
  onSearchChange,
  onAddItem,
  onImportItems,
  allLabels,
  allContentTypes,
  activeFilters,
  onFilterByLabel,
  onFilterByContentType,
  onTogglePinnedFilter,
  onClearFilters,
  sortOrder,
  onChangeSortOrder
}) => {
  const hasActiveFilters = activeFilters.labels.length > 0 || 
                          activeFilters.contentType !== null || 
                          activeFilters.showPinnedOnly;
  
  return (
    <div className="w-64 border-r border-gray-700/50 flex flex-col bg-gray-800/30">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Archive className="text-gray-400" size={20} />
          <h2 className="text-lg font-semibold text-gray-100">Knowledge Vault</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vault..."
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            onClick={onAddItem}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
          >
            <Plus size={16} />
            <span>Add New Item</span>
          </button>
          
          <button
            onClick={onImportItems}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 transition-colors"
          >
            <Upload size={16} />
            <span>Import Items</span>
          </button>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mb-4 bg-blue-500/10 rounded-md p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-300 flex items-center">
                <Filter size={12} className="mr-1" />
                Active Filters
              </span>
              <button
                onClick={onClearFilters}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.labels.map(label => (
                <span 
                  key={label}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300"
                >
                  <Tag size={10} className="mr-1" />
                  {label}
                  <button
                    onClick={() => onFilterByLabel(label)}
                    className="ml-1 text-blue-300 hover:text-blue-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {activeFilters.contentType && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                  <FileCode size={10} className="mr-1" />
                  {activeFilters.contentType}
                  <button
                    onClick={() => onFilterByContentType(null)}
                    className="ml-1 text-blue-300 hover:text-blue-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {activeFilters.showPinnedOnly && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                  <Pin size={10} className="mr-1" />
                  Pinned Only
                  <button
                    onClick={onTogglePinnedFilter}
                    className="ml-1 text-blue-300 hover:text-blue-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Sort Options */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
            <SortDesc size={14} className="mr-1.5" />
            Sort By
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => onChangeSortOrder('title')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                sortOrder === 'title' 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center">
                <SortAsc size={14} className="mr-2" />
                Title
              </span>
            </button>
            <button
              onClick={() => onChangeSortOrder('lastUsed')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                sortOrder === 'lastUsed' 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center">
                <Clock size={14} className="mr-2" />
                Last Used
              </span>
            </button>
            <button
              onClick={() => onChangeSortOrder('usageCount')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                sortOrder === 'usageCount' 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center">
                <Hash size={14} className="mr-2" />
                Most Used
              </span>
            </button>
            <button
              onClick={() => onChangeSortOrder('created')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                sortOrder === 'created' 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center">
                <Star size={14} className="mr-2" />
                Newest
              </span>
            </button>
          </div>
        </div>
        
        {/* Pinned Filter */}
        <div className="mb-4">
          <button
            onClick={onTogglePinnedFilter}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
              activeFilters.showPinnedOnly 
                ? 'bg-blue-500/20 text-blue-300' 
                : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <span className="flex items-center">
              <Pin size={14} className="mr-2" />
              Pinned Items
            </span>
          </button>
        </div>
        
        {/* Labels Filter */}
        {allLabels.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
              <Tag size={14} className="mr-1.5" />
              Labels
            </h3>
            <div className="space-y-1">
              {allLabels.map(label => (
                <button
                  key={label}
                  onClick={() => onFilterByLabel(label)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                    activeFilters.labels.includes(label) 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Content Types Filter */}
        {allContentTypes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
              <FileCode size={14} className="mr-1.5" />
              Content Types
            </h3>
            <div className="space-y-1">
              {allContentTypes.map(type => {
                const TypeIcon = getContentTypeIcon(type);
                return (
                  <button
                    key={type}
                    onClick={() => onFilterByContentType(type)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm ${
                      activeFilters.contentType === type 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="flex items-center">
                      <TypeIcon size={14} className="mr-2" />
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};