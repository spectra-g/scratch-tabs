import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StorageProviderFactory } from '../../../db';
import { BaseModal } from '../../../languages/json/components/modals/BaseModal';
import { useRootStore, useCacheStore } from '../../../stores';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { Tab } from '../../../types';
import { FolderPlus } from 'lucide-react';
import { languageRegistry } from '../../../languages';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useModalStore } from '../../../stores/modalStore';

// Import components from the Management folder
import { ConfirmationDialog } from './ConfirmationDialog';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { useModalClickOutside } from './hooks';
import { TabManagementToolbar, TabsContent, WorkspaceForm, DragOverlayUI } from './TabManagementUI';
import { TabManagementModalProps, SortOption, GroupOption } from './types';
import {
  useFilteredTabs,
  useGroupedTabs,
  useDuplicateTabs,
  useEmptyTabs,
  handleApplyCurrentOrder as applyCurrentOrderHelper,
  handleSwitchWorkspaceAndKeepModal as switchWorkspaceHelper,
  handleBaseModalClose as closeModalHelper,
  handleDragEnd as dragEndHelper,
  createMoveToWorkspaceWithIdHandler
} from './TabManagementModalImpl';

export const TabManagementModal: React.FC<TabManagementModalProps> = ({ isOpen, onClose }) => {
  const { removeTab, updateTabTitle, toggleTabPin, duplicateTab, updateTabTitle: updateTabTitleInStore } = useRootStore();
  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace
  } = useWorkspaceStore();
  const activeWorkspaceTabs = useRootStore(state =>
    state.tabs.filter(tab => tab.workspaceId === activeWorkspaceId)
  );
  const storage = StorageProviderFactory.getProvider();
  const [allApplicationTabs, setAllApplicationTabs] = useState<Tab[]>([]);
  const [isLoadingAllTabs, setIsLoadingAllTabs] = useState(false);
  const [editingTabIdForModal, setEditingTabIdForModal] = useState<string | null>(null);

  // Local state
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('current');
  const [groupOption, setGroupOption] = useState<GroupOption>('none');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [mergeDelimiter, setMergeDelimiter] = useState('\n\n');
  const [showRenameOptions, setShowRenameOptions] = useState(false);
  const [renameBasePattern, setRenameBasePattern] = useState('');
  const [renameSuffixPattern, setRenameSuffixPattern] = useState(' {d}');
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { switchWorkspace: switchWorkspaceFromStore } = useWorkspaceStore();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggedTabIds, setDraggedTabIds] = useState<Set<string>>(new Set());
  const [activeDragItemData, setActiveDragItemData] = useState<Tab | null>(null); // For DragOverlay content
  const { setTabManagementActionInProgress, isTabManagementActionInProgress } = useModalStore();
  const { cacheSplitViewForWorkspace } = useCacheStore();

  // Confirmation dialogs
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => { },
    isDestructive: false
  });

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTabIds(new Set());
      setSearchQuery('');
      setLanguageFilter([]);
    }
  }, [isOpen]);

  // Get available languages from tabs
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    activeWorkspaceTabs.forEach(tab => {
      if (tab.isTablet) {
        languages.add('tablet');
      } else {
        languages.add(tab.language);
      }
    });
    return Array.from(languages).sort();
  }, [activeWorkspaceTabs]);

  // Fetch ALL tabs when modal opens or workspaces change
  useEffect(() => {
    if (isOpen) {
      setIsLoadingAllTabs(true);
      storage.getTabs()
        .then(fetchedTabs => {
          setAllApplicationTabs(fetchedTabs);
        })
        .catch(err => {
          console.error("Failed to fetch all tabs for management modal:", err);
        })
        .finally(() => {
          setIsLoadingAllTabs(false);
        });
    }
  }, [isOpen, storage]);

  // Get workspace tab counts using allApplicationTabs
  const workspacesWithCounts = useMemo(() => {
    if (isLoadingAllTabs) {
      return workspaces.map(ws => ({ ...ws, tabCount: 0, isLoadingCount: true }));
    }
    return workspaces.map(workspace => {
      const tabCount = allApplicationTabs.filter(tab => tab.workspaceId === workspace.id).length;
      return { ...workspace, tabCount, isLoadingCount: false };
    });
  }, [workspaces, allApplicationTabs, isLoadingAllTabs]);

  // Get filtered and sorted tabs
  const filteredTabs = useFilteredTabs(
    activeWorkspaceTabs, 
    activeWorkspaceId, 
    searchQuery, 
    languageFilter, 
    sortOption
  );

  // Group tabs based on grouping option
  const groupedTabs = useGroupedTabs(filteredTabs, groupOption, workspaces, languageRegistry);

  // Check if there are any duplicate tabs
  const duplicateTabs = useDuplicateTabs(activeWorkspaceTabs, activeWorkspaceId);

  // Check if there are any empty tabs
  const emptyTabs = useEmptyTabs(activeWorkspaceTabs, activeWorkspaceId);

  // Apply the custom click outside hook
  useModalClickOutside(modalContentRef, isOpen, () => {
    if (!confirmationDialog.isOpen) { // Only close if no confirmation is active
      onClose();
    }
  });

  // Reset selected tabs when switching workspaces
  useEffect(() => {
    setSelectedTabIds(new Set());
  }, [activeWorkspaceId]);

  // Create handler for moving tabs to another workspace
  const handleMoveToWorkspaceWithId = createMoveToWorkspaceWithIdHandler(
    activeWorkspaceId,
    allApplicationTabs,
    setTabManagementActionInProgress,
    setAllApplicationTabs,
    setDraggedTabIds,
    cacheSplitViewForWorkspace
  );

  // Event handlers
  const handleStartEditingTab = (tabId: string) => {
    setEditingTabIdForModal(tabId);
  };

  const handleSaveTabTitle = (tabId: string, newTitle: string) => {
    updateTabTitleInStore(tabId, newTitle);
    setEditingTabIdForModal(null);
  };

  const handleCancelEditingTab = () => {
    setEditingTabIdForModal(null);
  };

  const handleSelectTab = (tabId: string, multiSelect: boolean) => {
    setSelectedTabIds(prev => {
      const newSelection = new Set(prev);

      if (multiSelect) {
        // Toggle selection
        if (newSelection.has(tabId)) {
          newSelection.delete(tabId);
        } else {
          newSelection.add(tabId);
        }
      } else {
        // Single selection
        newSelection.clear();
        newSelection.add(tabId);
      }

      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allTabIds = new Set(filteredTabs.map(tab => tab.id));
    setSelectedTabIds(allTabIds);
  };

  const handleDeselectAll = () => {
    setSelectedTabIds(new Set());
  };

  const handleDoubleClickTab = (tabId: string) => {
    // Open the tab and close the modal
    const tab = activeWorkspaceTabs.find(t => t.id === tabId);
    if (tab) {
      // Determine which side to activate
      const { splitView, setActiveLeftTab, setActiveRightTab } = useRootStore.getState();

      if (splitView.leftTabs.includes(tabId)) {
        setActiveLeftTab(tabId);
      } else if (splitView.rightTabs.includes(tabId)) {
        setActiveRightTab(tabId);
      } else {
        // Default to left side if not found in either
        setActiveLeftTab(tabId);
      }

      onClose();
    }
  };

  const handleModifiedApplyCurrentOrder = (eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]) => {
    const newSortOption = applyCurrentOrderHelper(eventOrTabs, filteredTabs);
    setSortOption(newSortOption as SortOption);
  };

  const handleCloseTabs = () => {
    if (selectedTabIds.size === 0) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Close Tabs',
      message: `Are you sure you want to close ${selectedTabIds.size} tab(s)? This action cannot be undone.`,
      confirmText: 'Close Tabs',
      cancelText: 'Cancel',
      onConfirm: () => {
        selectedTabIds.forEach(id => {
          removeTab(id);
        });
        setSelectedTabIds(new Set());
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleTogglePinSelectedTabs = () => {
    if (selectedTabIds.size === 0) return;

    // Determine if we are pinning or unpinning based on the first selected tab's current state
    let actionIsPin = false;
    const firstSelectedTabId = Array.from(selectedTabIds)[0];
    const firstTab = activeWorkspaceTabs.find(t => t.id === firstSelectedTabId);
    if (firstTab) {
      actionIsPin = !firstTab.isPinned;
    }

    selectedTabIds.forEach(id => {
      // Only toggle if the action aligns or if it's a single selection
      const tab = activeWorkspaceTabs.find(t => t.id === id);
      if (tab) {
        if (selectedTabIds.size === 1 || (actionIsPin && !tab.isPinned) || (!actionIsPin && tab.isPinned)) {
          toggleTabPin(id);
        }
      }
    });
  };

  const handleDuplicateTabs = () => {
    if (selectedTabIds.size === 0) return;

    // Simply duplicate all selected tabs with "(copy)" suffix
    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));

    selectedTabs.forEach(tab => {
      const newTabId = duplicateTab(tab.id, false);
      const newTitle = `${tab.title} (copy)`;
      updateTabTitle(newTabId, newTitle);
    });

    // Clear selection after duplication
    setSelectedTabIds(new Set());
  };

  const handleBulkRename = () => {
    if (selectedTabIds.size === 0 || !renameBasePattern.trim()) return;

    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));

    selectedTabs.forEach((tab, index) => {
      // Replace {d} in the suffix with the tab's index+1
      const suffix = renameSuffixPattern.replace('{d}', (index + 1).toString());
      const newTitle = renameBasePattern.trim() + suffix;
      updateTabTitle(tab.id, newTitle);
    });

    setShowRenameOptions(false);
    setRenameBasePattern('');
    // Keep the suffix pattern for next time

    // Clear selection after renaming
    setSelectedTabIds(new Set());
  };

  const handleMergeTabs = () => {
    if (selectedTabIds.size < 2) return;

    const selectedTabs = activeWorkspaceTabs.filter(tab => selectedTabIds.has(tab.id));

    // Check if all selected tabs are text-based (not tablets)
    const allTextBased = selectedTabs.every(tab => !tab.isTablet);

    if (!allTextBased) {
      alert('Only text-based tabs can be merged. Please deselect any tablet tabs.');
      return;
    }

    // Sort tabs by title before merging
    const sortedTabs = [...selectedTabs].sort((a, b) => a.title.localeCompare(b.title));

    // Process the delimiter to handle escape sequences
    let processedDelimiter = mergeDelimiter;
    if (mergeDelimiter === '\\n\\n') {
      processedDelimiter = '\n\n';
    } else if (mergeDelimiter === '\\n') {
      processedDelimiter = '\n';
    } else if (mergeDelimiter === '\\n---\\n') {
      processedDelimiter = '\n---\n';
    }

    // Merge content with the specified delimiter
    const mergedContent = sortedTabs.map(tab => tab.content).join(processedDelimiter);

    // Create a new tab with the merged content
    const { addTab } = useRootStore.getState();

    addTab({
      id: crypto.randomUUID(),
      title: 'Merged Tabs',
      content: mergedContent,
      language: 'plaintext', // Default to plaintext
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: activeWorkspaceId || ''
    });

    // Delete the original tabs
    selectedTabIds.forEach(id => {
      removeTab(id);
    });

    setShowMergeOptions(false);
    setSelectedTabIds(new Set());
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;

    createWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setIsCreatingWorkspace(false);
  };

  const handleRenameWorkspace = () => {
    if (!editingWorkspaceId || !editingWorkspaceName.trim()) return;

    renameWorkspace(editingWorkspaceId, editingWorkspaceName.trim());
    setEditingWorkspaceId(null);
    setEditingWorkspaceName('');
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Delete Workspace',
      message: `Are you sure you want to delete the workspace "${workspace.name}"? All tabs in this workspace will be permanently deleted.`,
      confirmText: 'Delete Workspace',
      cancelText: 'Cancel',
      onConfirm: () => {
        deleteWorkspace(workspaceId);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleRemoveDuplicates = () => {
    const duplicateGroups = Object.values(duplicateTabs);
    if (duplicateGroups.length === 0) return;

    setConfirmationDialog({
      isOpen: true,
      title: 'Remove Duplicate Tabs',
      message: `Found ${duplicateGroups.length} groups of duplicate tabs. Do you want to keep only the newest tab from each group and remove the rest?`,
      confirmText: 'Remove Duplicates',
      cancelText: 'Cancel',
      onConfirm: () => {
        // For each group of duplicates, keep the newest and remove the rest
        duplicateGroups.forEach(group => {
          // Sort by lastModified (descending)
          const sorted = [...group].sort((a, b) => b.lastModified - a.lastModified);

          // Keep the first one (newest) and remove the rest
          for (let i = 1; i < sorted.length; i++) {
            removeTab(sorted[i].id);
          }
        });

        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRemoveEmptyTabs = () => {
    if (emptyTabs.length === 0) return;

    // Directly remove all empty tabs without confirmation
    emptyTabs.forEach(tab => {
      removeTab(tab.id);
    });
  };

  const handleSwitchWorkspaceAndKeepModal = (workspaceId: string, event: React.MouseEvent) => {
    switchWorkspaceHelper(
      workspaceId, 
      event, 
      activeWorkspaceId, 
      switchWorkspaceFromStore, 
      setTabManagementActionInProgress, 
      setSelectedTabIds
    );
  };

  const handleBaseModalClose = () => {
    closeModalHelper(onClose, isTabManagementActionInProgress);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const tabId = active.id as string;
    const draggedTab = allApplicationTabs.find(t => t.id === tabId);

    if (!draggedTab) return;

    setActiveDragId(tabId);
    setActiveDragItemData(draggedTab || null);

    // Use the existing selectedTabIds if the tab is part of the selection,
    // otherwise create a new set with just this tab
    const newDraggedIds = selectedTabIds.has(tabId) ? new Set(selectedTabIds) : new Set([tabId]);
    setDraggedTabIds(newDraggedIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    dragEndHelper(
      event,
      setActiveDragId,
      setDraggedTabIds,
      draggedTabIds,
      activeWorkspaceId,
      filteredTabs,
      handleMoveToWorkspaceWithId,
      handleModifiedApplyCurrentOrder
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <BaseModal title="Tab Management" onClose={handleBaseModalClose} maxWidthClass="max-w-6xl" maxHeightClass="max-h-[90vh]">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={modalContentRef} className="flex h-[70vh]">
          {/* Left sidebar - Workspaces */}
          <div className="w-64 border-r border-gray-700/50 flex flex-col">
            <div className="p-3 border-b border-gray-700/50"> {/* Header for workspace section */}
              <h3 className="text-sm font-medium text-gray-300 mb-2">Workspaces</h3>

              {/* Create workspace button */}
              <button
                onClick={() => setIsCreatingWorkspace(true)}
                className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors text-sm"
              >
                <FolderPlus size={14} />
                <span>New Workspace</span>
              </button>

              {/* Create workspace form */}
              {isCreatingWorkspace && (
                <WorkspaceForm
                  isCreating={true}
                  workspaceName={newWorkspaceName}
                  setWorkspaceName={setNewWorkspaceName}
                  handleCreate={handleCreateWorkspace}
                  onCancel={() => setIsCreatingWorkspace(false)}
                />
              )}

              {/* Edit workspace form */}
              {editingWorkspaceId && (
                <WorkspaceForm
                  isCreating={false}
                  workspaceName={editingWorkspaceName}
                  setWorkspaceName={setEditingWorkspaceName}
                  handleRename={handleRenameWorkspace}
                  onCancel={() => { setEditingWorkspaceId(null); setEditingWorkspaceName(''); }}
                />
              )}
            </div>

            {/* Workspace list */}
            <WorkspaceSidebar
              workspaces={workspacesWithCounts}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={handleSwitchWorkspaceAndKeepModal}
              onRename={(id) => {
                setEditingWorkspaceId(id);
                const workspace = workspaces.find(w => w.id === id);
                if (workspace) {
                  setEditingWorkspaceName(workspace.name);
                }
              }}
              onDelete={handleDeleteWorkspace}
            />
          </div>

          {/* Main content - Tabs */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <TabManagementToolbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              availableLanguages={availableLanguages}
              languageFilter={languageFilter}
              setLanguageFilter={setLanguageFilter}
              sortOption={sortOption}
              setSortOption={setSortOption}
              groupOption={groupOption}
              setGroupOption={setGroupOption}
              selectedTabIds={selectedTabIds}
              filteredTabs={filteredTabs}
              handleDeselectAll={handleDeselectAll}
              handleSelectAll={handleSelectAll}
              handleApplyCurrentOrder={handleModifiedApplyCurrentOrder}
              handleTogglePinSelectedTabs={handleTogglePinSelectedTabs}
              handleDuplicateTabs={handleDuplicateTabs}
              showRenameOptions={showRenameOptions}
              setShowRenameOptions={setShowRenameOptions}
              renameBasePattern={renameBasePattern}
              setRenameBasePattern={setRenameBasePattern}
              renameSuffixPattern={renameSuffixPattern}
              setRenameSuffixPattern={setRenameSuffixPattern}
              handleBulkRename={handleBulkRename}
              showMergeOptions={showMergeOptions}
              setShowMergeOptions={setShowMergeOptions}
              mergeDelimiter={mergeDelimiter}
              setMergeDelimiter={setMergeDelimiter}
              handleMergeTabs={handleMergeTabs}
              handleCloseTabs={handleCloseTabs}
              activeWorkspaceTabs={activeWorkspaceTabs}
              activeWorkspaceId={activeWorkspaceId}
            />

            {/* Tab list */}
            <TabsContent
              duplicateTabs={duplicateTabs}
              handleRemoveDuplicates={handleRemoveDuplicates}
              emptyTabs={emptyTabs}
              handleRemoveEmptyTabs={handleRemoveEmptyTabs}
              filteredTabs={filteredTabs}
              groupedTabs={groupedTabs}
              activeWorkspaceId={activeWorkspaceId}
              selectedTabIds={selectedTabIds}
              handleSelectTab={handleSelectTab}
              handleDoubleClickTab={handleDoubleClickTab}
              editingTabIdForModal={editingTabIdForModal}
              handleStartEditingTab={handleStartEditingTab}
              handleSaveTabTitle={handleSaveTabTitle}
              handleCancelEditingTab={handleCancelEditingTab}
            />
          </div>
        </div>

        <DragOverlayUI
          activeDragId={activeDragId}
          activeDragItemData={activeDragItemData}
          draggedTabIds={draggedTabIds}
        />
      </DndContext>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText={confirmationDialog.confirmText}
        cancelText={confirmationDialog.cancelText}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={() => setConfirmationDialog(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmationDialog.isDestructive}
      />
    </BaseModal>
  );
}; 