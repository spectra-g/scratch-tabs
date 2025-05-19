import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tablet, TabletState } from '../types';
import { Archive, Search, Plus, Tag, FileCode, Filter, SortDesc, Pin, Copy, ExternalLink, Trash2, Edit, Check, X, ChevronDown, ChevronUp, Clock, Hash, Star, SortAsc } from 'lucide-react';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { detectLanguage } from '../../languages';
import { VaultItemCard } from './components/VaultItemCard';
import { VaultItemModal } from './components/VaultItemModal';
import { VaultSidebar } from './components/VaultSidebar';
import { VaultItem, SortOrder, VaultTabletState, ContentType } from './types';
import { getContentTypeIcon, detectContentType, getFileExtensionForContentType } from './utils/contentTypeUtils';
import { filterItems, sortItems } from './utils/filterUtils';

export const VaultTablet: Tablet = {
  id: 'vault',
  label: 'Knowledge Vault',
  keywords: ['vault', 'snippets', 'knowledge base', 'code', 'notes', 'commands'],

  createInitialState(): VaultTabletState {
    return {
      type: 'vault',
      data: {
        items: [],
        searchQuery: '',
        activeFilters: {
          labels: [],
          contentType: null,
          showPinnedOnly: false
        },
        sortOrder: 'lastUsed',
        editItem: null,
        isAddingItem: false
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'vault' && parsed.data) {
        // Ensure all items have the expected properties
        if (Array.isArray(parsed.data.items)) {
          parsed.data.items = parsed.data.items.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            title: item.title || 'Untitled',
            content: item.content || '',
            contentType: item.contentType || 'plaintext',
            labels: Array.isArray(item.labels) ? item.labels : [],
            createdTimestamp: item.createdTimestamp || Date.now(),
            modifiedTimestamp: item.modifiedTimestamp || Date.now(),
            isPinned: !!item.isPinned,
            usageCount: item.usageCount || 0,
            lastUsedTimestamp: item.lastUsedTimestamp || item.createdTimestamp || Date.now()
          }));
        }
        
        // Ensure other state properties
        parsed.data.searchQuery = parsed.data.searchQuery || '';
        parsed.data.activeFilters = parsed.data.activeFilters || {
          labels: [],
          contentType: null,
          showPinnedOnly: false
        };
        parsed.data.sortOrder = parsed.data.sortOrder || 'lastUsed';
        parsed.data.editItem = null; // Always reset edit state on load
        parsed.data.isAddingItem = false; // Always reset add state on load
        
        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize vault state:", e);
    }
    
    // Return default state if parsing fails
    return this.createInitialState();
  },

  render(state: VaultTabletState, onChange) {
    const { addBackgroundTab, splitView } = useRootStore();
    const { activeWorkspaceId } = useWorkspaceStore();
    
    // Local state for UI interactions
    const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
    const [openedItemId, setOpenedItemId] = useState<string | null>(null);
    
    // Memoized filtered and sorted items
    const filteredItems = useMemo(() => {
      return filterItems(
        state.data.items,
        state.data.searchQuery,
        state.data.activeFilters
      );
    }, [
      state.data.items,
      state.data.searchQuery,
      state.data.activeFilters.labels,
      state.data.activeFilters.contentType,
      state.data.activeFilters.showPinnedOnly
    ]);
    
    const sortedItems = useMemo(() => {
      return sortItems(filteredItems, state.data.sortOrder);
    }, [filteredItems, state.data.sortOrder]);
    
    // Get all unique labels across all items
    const allLabels = useMemo(() => {
      const labelSet = new Set<string>();
      state.data.items.forEach(item => {
        item.labels.forEach(label => labelSet.add(label));
      });
      return Array.from(labelSet).sort();
    }, [state.data.items]);
    
    // Get all unique content types across all items
    const allContentTypes = useMemo(() => {
      const contentTypeSet = new Set<ContentType>();
      state.data.items.forEach(item => {
        contentTypeSet.add(item.contentType as ContentType);
      });
      return Array.from(contentTypeSet).sort();
    }, [state.data.items]);
    
    // Handlers
    const handleSearchChange = useCallback((query: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          searchQuery: query
        }
      });
    }, [state, onChange]);
    
    const handleFilterByLabel = useCallback((label: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeFilters: {
            ...state.data.activeFilters,
            labels: state.data.activeFilters.labels.includes(label)
              ? state.data.activeFilters.labels.filter(l => l !== label)
              : [...state.data.activeFilters.labels, label]
          }
        }
      });
    }, [state, onChange]);
    
    const handleFilterByContentType = useCallback((contentType: ContentType | null) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeFilters: {
            ...state.data.activeFilters,
            contentType: state.data.activeFilters.contentType === contentType ? null : contentType
          }
        }
      });
    }, [state, onChange]);
    
    const handleTogglePinnedFilter = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeFilters: {
            ...state.data.activeFilters,
            showPinnedOnly: !state.data.activeFilters.showPinnedOnly
          }
        }
      });
    }, [state, onChange]);
    
    const handleChangeSortOrder = useCallback((sortOrder: SortOrder) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          sortOrder
        }
      });
    }, [state, onChange]);
    
    const handleClearFilters = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeFilters: {
            labels: [],
            contentType: null,
            showPinnedOnly: false
          }
        }
      });
    }, [state, onChange]);
    
    const handleAddItem = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          isAddingItem: true
        }
      });
    }, [state, onChange]);
    
    const handleEditItem = useCallback((item: VaultItem) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          editItem: { ...item }
        }
      });
    }, [state, onChange]);
    
    const handleCloseModal = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          editItem: null,
          isAddingItem: false
        }
      });
    }, [state, onChange]);
    
    const handleSaveItem = useCallback((item: VaultItem, isNew: boolean) => {
      const now = Date.now();
      const newItem = {
        ...item,
        modifiedTimestamp: now
      };
      
      if (isNew) {
        newItem.id = crypto.randomUUID();
        newItem.createdTimestamp = now;
        newItem.lastUsedTimestamp = now;
        newItem.usageCount = 0;
        
        onChange({
          ...state,
          data: {
            ...state.data,
            items: [newItem, ...state.data.items],
            editItem: null,
            isAddingItem: false
          }
        });
      } else {
        onChange({
          ...state,
          data: {
            ...state.data,
            items: state.data.items.map(i => i.id === item.id ? newItem : i),
            editItem: null
          }
        });
      }
    }, [state, onChange]);
    
    const handleDeleteItem = useCallback((id: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          items: state.data.items.filter(item => item.id !== id)
        }
      });
    }, [state, onChange]);
    
    const handleTogglePin = useCallback((id: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          items: state.data.items.map(item => 
            item.id === id 
              ? { ...item, isPinned: !item.isPinned }
              : item
          )
        }
      });
    }, [state, onChange]);
    
    const handleCopyContent = useCallback((id: string) => {
      const item = state.data.items.find(item => item.id === id);
      if (!item) return;
      
      navigator.clipboard.writeText(item.content);
      setCopiedItemId(id);
      
      // Update usage stats
      const now = Date.now();
      onChange({
        ...state,
        data: {
          ...state.data,
          items: state.data.items.map(i => 
            i.id === id 
              ? { 
                  ...i, 
                  usageCount: i.usageCount + 1,
                  lastUsedTimestamp: now
                }
              : i
          )
        }
      });
      
      setTimeout(() => setCopiedItemId(null), 1500);
    }, [state, onChange]);
    
    const handleOpenInNewTab = useCallback((id: string) => {
      const item = state.data.items.find(item => item.id === id);
      if (!item) return;
      
      setOpenedItemId(id);
      
      // Determine which pane to open in
      const paneElem = document.querySelector('[data-editor-pane-side]');
      const sideAttr = paneElem?.getAttribute('data-editor-pane-side');
      const isRightSide = splitView.isSplit && sideAttr === 'right';
      
      // Detect language if not already set
      const language = item.contentType === 'plaintext' 
        ? detectLanguage(item.content)
        : item.contentType;
      
      // Create a new tab with the content
      addBackgroundTab({
        id: crypto.randomUUID(),
        title: item.title,
        content: item.content,
        language,
        languageLocked: true,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        workspaceId: activeWorkspaceId || ''
      }, isRightSide);
      
      // Update usage stats
      const now = Date.now();
      onChange({
        ...state,
        data: {
          ...state.data,
          items: state.data.items.map(i => 
            i.id === id 
              ? { 
                  ...i, 
                  usageCount: i.usageCount + 1,
                  lastUsedTimestamp: now
                }
              : i
          )
        }
      });
      
      setTimeout(() => setOpenedItemId(null), 1500);
    }, [state, onChange, addBackgroundTab, splitView.isSplit, activeWorkspaceId]);
    
    const handleOpenUrl = useCallback((id: string) => {
      const item = state.data.items.find(item => item.id === id);
      if (!item || item.contentType !== 'url') return;
      
      // Try to open the URL
      try {
        window.open(item.content, '_blank');
        
        // Update usage stats
        const now = Date.now();
        onChange({
          ...state,
          data: {
            ...state.data,
            items: state.data.items.map(i => 
              i.id === id 
                ? { 
                    ...i, 
                    usageCount: i.usageCount + 1,
                    lastUsedTimestamp: now
                  }
                : i
            )
          }
        });
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }, [state, onChange]);
    
    return (
      <div className="h-full bg-gray-900 flex">
        {/* Sidebar */}
        <VaultSidebar
          searchQuery={state.data.searchQuery}
          onSearchChange={handleSearchChange}
          onAddItem={handleAddItem}
          allLabels={allLabels}
          allContentTypes={allContentTypes}
          activeFilters={state.data.activeFilters}
          onFilterByLabel={handleFilterByLabel}
          onFilterByContentType={handleFilterByContentType}
          onTogglePinnedFilter={handleTogglePinnedFilter}
          onClearFilters={handleClearFilters}
          sortOrder={state.data.sortOrder}
          onChangeSortOrder={handleChangeSortOrder}
        />
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          {/* Header with item count */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-100">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </h2>
            <button
              onClick={handleAddItem}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
            >
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>
          
          {/* Items Grid */}
          {sortedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedItems.map(item => (
                <VaultItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => handleEditItem(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onTogglePin={() => handleTogglePin(item.id)}
                  onCopy={() => handleCopyContent(item.id)}
                  onOpenInNewTab={() => handleOpenInNewTab(item.id)}
                  onOpenUrl={() => handleOpenUrl(item.id)}
                  isCopied={copiedItemId === item.id}
                  isOpened={openedItemId === item.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              {state.data.searchQuery || 
               state.data.activeFilters.labels.length > 0 || 
               state.data.activeFilters.contentType || 
               state.data.activeFilters.showPinnedOnly ? (
                <>
                  <Filter size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">No items match your filters</p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <Archive size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">Your vault is empty</p>
                  <p className="text-sm mt-2">Add your first item to get started</p>
                  <button
                    onClick={handleAddItem}
                    className="mt-4 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md text-sm transition-colors"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Add Item
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Edit/Add Modal */}
        {(state.data.editItem || state.data.isAddingItem) && (
          <VaultItemModal
            item={state.data.editItem || {
              id: '',
              title: '',
              content: '',
              contentType: 'plaintext',
              labels: [],
              createdTimestamp: 0,
              modifiedTimestamp: 0,
              isPinned: false,
              usageCount: 0,
              lastUsedTimestamp: 0
            }}
            isNew={state.data.isAddingItem}
            onSave={handleSaveItem}
            onClose={handleCloseModal}
            existingLabels={allLabels}
          />
        )}
      </div>
    );
  }
};