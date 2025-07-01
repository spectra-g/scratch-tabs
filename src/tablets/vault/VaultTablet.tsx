import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tablet, TabletState } from '../types';
import { Archive, Plus, Filter, Pin, Copy, ExternalLink, Trash2, Edit, Check, X, Hash, LayoutGrid, List, CopyPlus, Globe } from 'lucide-react';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { detectLanguage } from '../../languages';
import { VaultItemCard } from './components/VaultItemCard';
import { VaultItemModal } from './components/VaultItemModal';
import { VaultSidebar } from './components/VaultSidebar';
import { VaultImportModal } from './components/VaultImportModal';
import { VaultItem, SortOrder, VaultTabletState, ContentType } from './types';
import { getContentTypeIcon } from './utils/contentTypeUtils';
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
        isAddingItem: false,
        viewMode: 'card' // Default to card view
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
        parsed.data.viewMode = parsed.data.viewMode || 'card'; // Add viewMode with default

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
    const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
    const [preserveOrder, setPreserveOrder] = useState<boolean>(false);

    // Store the current sorted order in state when we need to preserve it
    const [manualOrder, setManualOrder] = useState<string[]>([]);

    // Import modal state
    const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

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
      // If we're preserving order, use the manual order instead of sorting
      if (preserveOrder && manualOrder.length > 0) {
        // Create a map for O(1) lookups
        const itemMap = new Map(filteredItems.map(item => [item.id, item]));

        // Get items in the manual order, but only if they exist in filtered items
        const orderedItems = manualOrder
          .map(id => itemMap.get(id))
          .filter(item => item !== undefined) as VaultItem[];

        // Add any new items that weren't in the manual order
        const newItemIds = new Set(manualOrder);
        const newItems = filteredItems.filter(item => !newItemIds.has(item.id));

        return [...orderedItems, ...newItems];
      }

      // Otherwise use the normal sorting
      return sortItems(filteredItems, state.data.sortOrder);
    }, [filteredItems, state.data.sortOrder, preserveOrder, manualOrder]);

    // Initialize manual order when items change
    useEffect(() => {
      if (!preserveOrder && sortedItems.length > 0) {
        const newManualOrderIds = sortedItems.map(item => item.id);
        if (JSON.stringify(newManualOrderIds) !== JSON.stringify(manualOrder)) {
          setManualOrder(newManualOrderIds);
        }
      }
    }, [state.data.items, state.data.activeFilters, state.data.sortOrder, preserveOrder, sortedItems, manualOrder]);

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
      // Reset preserved order when filtering
      setPreserveOrder(false);

      onChange({
        ...state,
        data: {
          ...state.data,
          searchQuery: query
        }
      });
    }, [state, onChange]);

    const handleFilterByLabel = useCallback((label: string) => {
      // Reset preserved order when filtering
      setPreserveOrder(false);

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
      // Reset preserved order when filtering
      setPreserveOrder(false);

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
      // Reset preserved order when filtering
      setPreserveOrder(false);

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
      // Reset preserved order when changing sort order
      setPreserveOrder(false);

      onChange({
        ...state,
        data: {
          ...state.data,
          sortOrder
        }
      });
    }, [state, onChange]);

    const handleClearFilters = useCallback(() => {
      // Reset preserved order when filtering
      setPreserveOrder(false);

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

    const handleImportItems = useCallback(() => {
      setIsImportModalOpen(true);
    }, []);

    const handleCloseImportModal = useCallback(() => {
      setIsImportModalOpen(false);
    }, []);

    const handleImportItemsConfirm = useCallback((newItems: VaultItem[]) => {
      // Add new items to the beginning of the list
      onChange({
        ...state,
        data: {
          ...state.data,
          items: [...newItems, ...state.data.items]
        }
      });
      setIsImportModalOpen(false);
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

      // Save the current order before updating
      if ((state.data.sortOrder === 'lastUsed' || state.data.sortOrder === 'usageCount') && sortedItems.length > 0) {
        setManualOrder(sortedItems.map(item => item.id));
        setPreserveOrder(true);
      }

      // Always update usage count and lastUsedTimestamp
      const now = Date.now();
      const updatedItems = state.data.items.map(i =>
        i.id === id
          ? {
            ...i,
            usageCount: i.usageCount + 1,
            lastUsedTimestamp: now
          }
          : i
      );

      onChange({
        ...state,
        data: {
          ...state.data,
          items: updatedItems
        }
      });

      setTimeout(() => setCopiedItemId(null), 1500);
    }, [state, onChange, sortedItems]);

    const handleDuplicateItem = useCallback((id: string) => {
      const item = state.data.items.find(item => item.id === id);
      if (!item) return;

      // Save the current order before updating
      if ((state.data.sortOrder === 'created' || state.data.sortOrder === 'lastUsed' || state.data.sortOrder === 'usageCount') && sortedItems.length > 0) {
        setManualOrder(sortedItems.map(item => item.id));
        setPreserveOrder(true);
      }

      const now = Date.now();
      const duplicatedItem: VaultItem = {
        ...item,
        id: crypto.randomUUID(),
        title: `${item.title} (copy)`,
        modifiedTimestamp: now,
        usageCount: 0
      };

      // For 'created' sort, preserve the original timestamp but make it just slightly newer
      // This will place it next to the original item
      if (state.data.sortOrder === 'created') {
        duplicatedItem.createdTimestamp = item.createdTimestamp + 1;
      } else {
        duplicatedItem.createdTimestamp = now;
      }

      // Insert the duplicated item in the appropriate position
      let newItems: VaultItem[];

      if (state.data.sortOrder === 'created') {
        // Find the index of the original item
        const originalIndex = state.data.items.findIndex(i => i.id === id);
        if (originalIndex !== -1) {
          // Insert the duplicated item right after the original item
          newItems = [...state.data.items];
          newItems.splice(originalIndex + 1, 0, duplicatedItem);
        } else {
          // Fallback if original item not found (shouldn't happen)
          newItems = [...state.data.items, duplicatedItem];
        }
      } else {
        // Default behavior for other sort orders
        newItems = [duplicatedItem, ...state.data.items];
      }

      onChange({
        ...state,
        data: {
          ...state.data,
          items: newItems
        }
      });
    }, [state, onChange, sortedItems]);

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

      // Save the current order before updating
      if ((state.data.sortOrder === 'lastUsed' || state.data.sortOrder === 'usageCount') && sortedItems.length > 0) {
        setManualOrder(sortedItems.map(item => item.id));
        setPreserveOrder(true);
      }

      // Update usage stats
      const now = Date.now();
      const updatedItems = state.data.items.map(i => {
        if (i.id === id) {
          return {
            ...i,
            usageCount: i.usageCount + 1,
            lastUsedTimestamp: now
          };
        }
        return i;
      });

      onChange({
        ...state,
        data: {
          ...state.data,
          items: updatedItems
        }
      });

      setTimeout(() => setOpenedItemId(null), 1500);
    }, [state, onChange, addBackgroundTab, splitView.isSplit, activeWorkspaceId, sortedItems]);

    const handleOpenUrl = useCallback((id: string) => {
      const item = state.data.items.find(item => item.id === id);
      if (!item || item.contentType !== 'url') return;

      // Try to open the URL
      try {
        window.open(item.content, '_blank');

        // Save the current order before updating
        if ((state.data.sortOrder === 'lastUsed' || state.data.sortOrder === 'usageCount') && sortedItems.length > 0) {
          setManualOrder(sortedItems.map(item => item.id));
          setPreserveOrder(true);
        }

        // Update usage stats
        const now = Date.now();
        const updatedItems = state.data.items.map(i => {
          if (i.id === id) {
            return {
              ...i,
              usageCount: i.usageCount + 1,
              lastUsedTimestamp: now
            };
          }
          return i;
        });

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems
          }
        });
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }, [state, onChange, sortedItems]);

    // Toggle view mode between card and list
    const handleToggleViewMode = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          viewMode: state.data.viewMode === 'card' ? 'list' : 'card'
        }
      });
    }, [state, onChange]);

    // Render a list item for the list view
    const renderListItem = (item: VaultItem) => {
      const ContentTypeIcon = getContentTypeIcon(item.contentType);
      const isShowingDeleteConfirm = deleteConfirmItemId === item.id;

      // Determine what primary action button to show based on content type
      const renderPrimaryAction = () => {
        if (item.contentType === 'url') {
          return (
            <button
              onClick={() => handleOpenUrl(item.id)}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
              title="Open URL"
            >
              <Globe size={16} />
            </button>
          );
        }

        return (
          <button
            onClick={() => handleOpenInNewTab(item.id)}
            className={`p-1.5 transition-colors ${openedItemId === item.id
              ? 'text-green-400'
              : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50'
              }`}
            title="Open in new tab"
          >
            {openedItemId === item.id ? <Check size={16} /> : <ExternalLink size={16} />}
          </button>
        );
      };

      return (
        <div
          key={item.id}
          className="flex items-center border-b border-gray-700/50 py-2 hover:bg-gray-800/50 px-3 transition-colors group relative cursor-pointer"
          onClick={() => handleCopyContent(item.id)}
        >
          {/* Icon + Count Section */}
          <div className="flex items-center gap-1 mr-3 flex-shrink-0">
            {/* Pin icon or spacer */}
            <div className="w-4 flex justify-center">
              {item.isPinned && <Pin size={14} className="text-yellow-400" />}
            </div>
            <ContentTypeIcon size={16} className="text-gray-400" />
            <Hash size={12} className="text-gray-400" />
            <div className="w-8 text-left text-gray-400 text-sm">{item.usageCount}</div>
          </div>

          {/* Main Content - Use flex-1 and min-w-0 to allow proper truncation */}
          <div className="flex-1 min-w-0 mr-4 font-mono text-sm text-gray-200 truncate">
            {item.content}
          </div>

          {/* Actions - Hidden by default, visible on hover */}
          <div className="flex items-center space-x-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isShowingDeleteConfirm ? (
              <>
                <button
                  onClick={() => handleCopyContent(item.id)}
                  className={`p-1.5 transition-colors ${copiedItemId === item.id
                    ? 'text-green-400'
                    : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700/50'
                    }`}
                  title="Copy content"
                >
                  {copiedItemId === item.id ? <Check size={16} /> : <Copy size={16} />}
                </button>

                <button
                  onClick={() => handleEditItem(item)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
                  title="Edit item"
                >
                  <Edit size={16} />
                </button>

                <button
                  onClick={() => handleDuplicateItem(item.id)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded transition-colors"
                  title="Duplicate item"
                >
                  <CopyPlus size={16} />
                </button>

                {renderPrimaryAction()}

                <button
                  onClick={() => handleTogglePin(item.id)}
                  className={`p-1.5 rounded transition-colors ${item.isPinned
                    ? 'text-yellow-400 hover:bg-yellow-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                    }`}
                  title={item.isPinned ? "Unpin item" : "Pin item"}
                >
                  <Pin size={16} />
                </button>

                <button
                  onClick={() => setDeleteConfirmItemId(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                  title="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-red-400 mr-1">Delete?</span>
                <button
                  onClick={() => setDeleteConfirmItemId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmItemId(null);
                    handleDeleteItem(item.id);
                  }}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                  title="Confirm delete"
                >
                  <Check size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="h-full bg-gray-900 flex">
        {/* Sidebar */}
        <VaultSidebar
          searchQuery={state.data.searchQuery}
          onSearchChange={handleSearchChange}
          onAddItem={handleAddItem}
          onImportItems={handleImportItems}
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
          {/* Header with item count and view mode toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-100">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleViewMode}
                className={`p-1.5 rounded-md transition-colors ${state.data.viewMode === 'card'
                  ? 'text-blue-400 bg-blue-500/20'
                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                title="Card view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={handleToggleViewMode}
                className={`p-1.5 rounded-md transition-colors ${state.data.viewMode === 'list'
                  ? 'text-blue-400 bg-blue-500/20'
                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                  }`}
                title="List view"
              >
                <List size={16} />
              </button>
              <button
                onClick={handleAddItem}
                className="flex items-center space-x-2 ml-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Items Display - Card or List view */}
          {sortedItems.length > 0 ? (
            state.data.viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedItems.map(item => (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleEditItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                    onTogglePin={() => handleTogglePin(item.id)}
                    onCopy={() => handleCopyContent(item.id)}
                    onDuplicate={() => handleDuplicateItem(item.id)}
                    onOpenInNewTab={() => handleOpenInNewTab(item.id)}
                    onOpenUrl={() => handleOpenUrl(item.id)}
                    isCopied={copiedItemId === item.id}
                    isOpened={openedItemId === item.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col space-y-0 border-t border-gray-700/50">
                {sortedItems.map(item => renderListItem(item))}
              </div>
            )
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

        {/* Import Modal */}
        {isImportModalOpen && (
          <VaultImportModal
            onImport={handleImportItemsConfirm}
            onClose={handleCloseImportModal}
            existingItems={state.data.items}
          />
        )}
      </div>
    );
  }
};