import React from 'react';
import {
  Search, X, Edit, Pin,
  Merge, Filter, ArrowDownAZ, ArrowUpZA, AlertTriangle,
  Layers, Copy
} from 'lucide-react';
import { Tab } from '../../../types';
import { languageRegistry } from '../../../languages';
import { DragOverlay } from '@dnd-kit/core';
import { TabGroup } from './TabGroup';
import { GroupOption, SortOption } from './types';

export interface TabManagementToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  availableLanguages: string[];
  languageFilter: string[];
  setLanguageFilter: (filter: string[]) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  groupOption: GroupOption;
  setGroupOption: (option: GroupOption) => void;
  selectedTabIds: Set<string>;
  filteredTabs: Tab[];
  handleDeselectAll: () => void;
  handleSelectAll: () => void;
  handleApplyCurrentOrder: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleTogglePinSelectedTabs: () => void;
  handleDuplicateTabs: () => void;
  showRenameOptions: boolean;
  setShowRenameOptions: (show: boolean) => void;
  renameBasePattern: string;
  setRenameBasePattern: (pattern: string) => void;
  renameSuffixPattern: string;
  setRenameSuffixPattern: (pattern: string) => void;
  handleBulkRename: () => void;
  showMergeOptions: boolean;
  setShowMergeOptions: (show: boolean) => void;
  mergeDelimiter: string;
  setMergeDelimiter: (delimiter: string) => void;
  handleMergeTabs: () => void;
  handleCloseTabs: () => void;
  activeWorkspaceTabs: Tab[];
  activeWorkspaceId: string | null;
}

// Toolbar UI Component
export const TabManagementToolbar: React.FC<TabManagementToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  availableLanguages,
  languageFilter,
  setLanguageFilter,
  sortOption,
  setSortOption,
  groupOption,
  setGroupOption,
  selectedTabIds,
  filteredTabs,
  handleDeselectAll,
  handleSelectAll,
  handleApplyCurrentOrder,
  handleTogglePinSelectedTabs,
  handleDuplicateTabs,
  showRenameOptions,
  setShowRenameOptions,
  renameBasePattern,
  setRenameBasePattern,
  renameSuffixPattern,
  setRenameSuffixPattern,
  handleBulkRename,
  showMergeOptions,
  setShowMergeOptions,
  mergeDelimiter,
  setMergeDelimiter,
  handleMergeTabs,
  handleCloseTabs,
  activeWorkspaceTabs,
  activeWorkspaceId
}) => (
  <div className="p-3 border-b border-gray-700/50">
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-grow max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tabs..."
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md pl-9 pr-3 py-1.5 text-sm text-gray-200"
        />
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      </div>

      {/* Language filter */}
      <div className="relative">
        <select
          value={languageFilter[0] || ''}
          onChange={(e) => {
            const selectedLang = e.target.value;
            setLanguageFilter(selectedLang ? [selectedLang] : []);
          }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
        >
          <option value="">All Languages</option>
          {availableLanguages.map((lang: string) => (
            <option key={lang} value={lang}>
              {lang === 'tablet' ? 'Tablets' : (languageRegistry.getById(lang)?.name || lang)}
            </option>
          ))}
        </select>
        <Filter size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      {/* Sort options */}
      <div className="relative">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
        >
          <option value="current">Current</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="created-asc">Newest First</option>
          <option value="created-desc">Oldest First</option>
          <option value="modified-asc">Recently Modified</option>
          <option value="modified-desc">Least Recently Modified</option>
          <option value="language">Language</option>
        </select>
        {sortOption.includes('asc') ? (
          <ArrowDownAZ size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
        ) : (
          <ArrowUpZA size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
        )}
      </div>

      {/* Group options */}
      <div className="relative">
        <select
          value={groupOption}
          onChange={(e) => setGroupOption(e.target.value as GroupOption)}
          className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 appearance-none pr-8"
        >
          <option value="none">No Grouping</option>
          <option value="language">Group by Language</option>
        </select>
        <Layers size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    </div>

    {/* Selection info and actions */}
    <div className="flex items-center justify-between mt-3">
      <div className="flex items-center space-x-3">
        <div className="text-sm text-gray-400">
          {selectedTabIds.size > 0
            ? `${selectedTabIds.size} tab(s) selected`
            : `${filteredTabs.length} tab(s) found`}
        </div>

        {selectedTabIds.size > 0 && (
          <div className="flex items-center space-x-1">
            <button
              onClick={handleDeselectAll}
              className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
            >
              Deselect All
            </button>
          </div>
        )}

        {selectedTabIds.size === 0 && filteredTabs.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
            >
              Select All
            </button>
            {sortOption !== 'current' && (
              <button
                onClick={handleApplyCurrentOrder}
                className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-300"
              >
                Apply Current Order
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedTabIds.size > 0 && activeWorkspaceTabs.some(tab => selectedTabIds.has(tab.id) && tab.workspaceId === activeWorkspaceId) && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTogglePinSelectedTabs}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
            title="Toggle pin status for selected"
          >
            <Pin size={14} className="text-gray-400" />
            <span>Toggle Pin</span>
          </button>

          <button
            onClick={handleDuplicateTabs}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
            title="Duplicate selected tabs with (copy) suffix"
          >
            <Copy size={14} className="text-gray-400" />
            <span>Duplicate</span>
          </button>

          {selectedTabIds.size >= 2 && (
            <div className="relative">
              <button
                onClick={() => setShowRenameOptions(!showRenameOptions)}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                title="Rename selected tabs with pattern"
              >
                <Edit size={14} className="text-gray-400" />
                <span>Rename</span>
              </button>

              {showRenameOptions && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                  <div className="text-xs text-gray-300 mb-2">Base Name</div>
                  <input
                    type="text"
                    value={renameBasePattern}
                    onChange={(e) => setRenameBasePattern(e.target.value)}
                    placeholder="e.g. My Tab"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                  />

                  <div className="text-xs text-gray-300 mb-2">Suffix Pattern</div>
                  <input
                    type="text"
                    value={renameSuffixPattern}
                    onChange={(e) => setRenameSuffixPattern(e.target.value)}
                    placeholder=" {d}"
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
                  />

                  <div className="text-xs text-gray-500 mb-3">
                    The {'{d}'} placeholder will be replaced with the tab number
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowRenameOptions(false)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkRename}
                      disabled={!renameBasePattern.trim()}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      Rename
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedTabIds.size >= 2 && (
            <div className="relative">
              <button
                onClick={() => setShowMergeOptions(!showMergeOptions)}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/50 rounded-md transition-colors"
                title="Merge selected tabs"
              >
                <Merge size={14} className="text-gray-400" />
                <span>Merge</span>
              </button>

              {showMergeOptions && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 w-64">
                  <div className="text-xs text-gray-300 mb-2">Delimiter Between Contents</div>
                  <select
                    value={mergeDelimiter}
                    onChange={(e) => setMergeDelimiter(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-3"
                  >
                    <option value="\n\n">Double Line Break</option>
                    <option value="\n">Single Line Break</option>
                    <option value="\n---\n">Markdown Separator</option>
                    <option value="">No Separator</option>
                  </select>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowMergeOptions(false)}
                      className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMergeTabs}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                    >
                      Merge Tabs
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCloseTabs}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors"
            title="Close selected tabs"
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>
      )}
    </div>
  </div>
);

export interface WorkspaceFormProps {
  isCreating?: boolean;
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  handleCreate?: () => void;
  handleRename?: () => void;
  onCancel: () => void;
}

// Workspace form component
export const WorkspaceForm: React.FC<WorkspaceFormProps> = ({
  isCreating = true,
  workspaceName,
  setWorkspaceName,
  handleCreate,
  handleRename,
  onCancel
}) => (
  <div className="mt-3 p-3 bg-gray-800/50 rounded-md">
    <input
      type="text"
      value={workspaceName}
      onChange={(e) => setWorkspaceName(e.target.value)}
      placeholder="Workspace name"
      className="w-full bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-sm text-gray-200 mb-2"
      autoFocus
    />
    <div className="flex justify-end space-x-2">
      <button
        onClick={onCancel}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
      >
        Cancel
      </button>
      <button
        onClick={isCreating ? handleCreate : handleRename}
        disabled={!workspaceName.trim()}
        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 disabled:opacity-50"
      >
        {isCreating ? 'Create' : 'Rename'}
      </button>
    </div>
  </div>
);

export interface TabsContentProps {
  duplicateTabs: Record<string, Tab[]>;
  handleRemoveDuplicates: () => void;
  emptyTabs: Tab[];
  handleRemoveEmptyTabs: () => void;
  filteredTabs: Tab[];
  groupedTabs: Record<string, Tab[]>;
  activeWorkspaceId: string | null;
  selectedTabIds: Set<string>;
  handleSelectTab: (tabId: string, multiSelect: boolean) => void;
  handleDoubleClickTab: (tabId: string) => void;
  editingTabIdForModal: string | null;
  handleStartEditingTab: (tabId: string) => void;
  handleSaveTabTitle: (tabId: string, newTitle: string) => void;
  handleCancelEditingTab: () => void;
}

// Tab content UI component
export const TabsContent: React.FC<TabsContentProps> = ({
  duplicateTabs,
  handleRemoveDuplicates,
  emptyTabs,
  handleRemoveEmptyTabs,
  filteredTabs,
  groupedTabs,
  activeWorkspaceId,
  selectedTabIds,
  handleSelectTab,
  handleDoubleClickTab,
  editingTabIdForModal,
  handleStartEditingTab,
  handleSaveTabTitle,
  handleCancelEditingTab
}) => (
  <div className="flex-1 overflow-y-auto custom-scrollbar">
    {Object.entries(duplicateTabs).length > 0 && (
      <div className="m-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle size={16} className="text-yellow-500 mr-2" />
          <span className="text-sm text-yellow-200">
            Found {Object.entries(duplicateTabs).length} groups of duplicate tabs
          </span>
        </div>
        <button
          onClick={handleRemoveDuplicates}
          className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors"
        >
          Remove Duplicates
        </button>
      </div>
    )}

    {emptyTabs.length > 1 && (
      <div className="m-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle size={16} className="text-blue-500 mr-2" />
          <span className="text-sm text-blue-200">
            Found {emptyTabs.length} empty tabs
          </span>
        </div>
        <button
          onClick={handleRemoveEmptyTabs}
          className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
        >
          Remove All
        </button>
      </div>
    )}

    {filteredTabs.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>No tabs found matching your criteria</p>
      </div>
    ) : (
      <div>
        {Object.entries(groupedTabs).map(([groupName, groupTabs]) => (
          <TabGroup
            key={`${activeWorkspaceId}-${groupName}`}
            title={groupName}
            tabs={groupTabs as Tab[]}
            selectedTabIds={selectedTabIds}
            onSelectTab={handleSelectTab}
            onDoubleClickTab={handleDoubleClickTab}
            editingTabId={editingTabIdForModal}
            onStartEditTab={handleStartEditingTab}
            onSaveTabTitle={handleSaveTabTitle}
            onCancelEditTab={handleCancelEditingTab}
            groupWorkspaceId={activeWorkspaceId!}
          />
        ))}
      </div>
    )}
  </div>
);

export interface DragOverlayUIProps {
  activeDragId: string | null;
  activeDragItemData: Tab | null;
  draggedTabIds: Set<string>;
}

// Drag overlay UI component 
export const DragOverlayUI: React.FC<DragOverlayUIProps> = ({ 
  activeDragId, 
  activeDragItemData, 
  draggedTabIds 
}) => (
  <DragOverlay dropAnimation={null}>
    {activeDragId && activeDragItemData && (
      <div className="pointer-events-none">
        {draggedTabIds.size === 1 ? (
          // Compact representation for single tab
          <div className="bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-md shadow-lg border border-gray-700 inline-block">
            {activeDragItemData.title}
          </div>
        ) : (
          // Compact representation for multiple tabs
          <div className="bg-gray-800 text-gray-200 text-xs px-3 py-1.5 rounded-md shadow-lg border border-gray-700 inline-block">
            {draggedTabIds.size} tabs
          </div>
        )}
      </div>
    )}
  </DragOverlay>
); 