import { useState, useEffect, useMemo, useRef } from 'react';
import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { StorageProviderFactory } from '../../../db';
import { useRootStore, useCacheStore, useTabsStore } from '../../../stores';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { Tab } from '../../../types';
import { languageRegistry } from '../../../languages';
import {
  useFilteredTabs,
  useGroupedTabs,
  useDuplicateTabs,
  useEmptyTabs,
  handleApplyCurrentOrder as applyCurrentOrderHelper,
  handleBaseModalClose as closeModalHelper,
  handleDragEnd as dragEndHelper,
  createMoveToWorkspaceWithIdHandler
} from './TabManagementModalImpl';
import { useModalClickOutside } from './hooks';
import { SortOption, GroupOption } from './types';
import { useActionLock } from '../../../hooks/useActionLock';

interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}

export interface TabManagementEngine {
  // Data state
  allApplicationTabs: Tab[];
  isLoadingAllTabs: boolean;
  activeWorkspaceTabs: Tab[];
  workspacesWithCounts: Array<{ id: string; name: string; tabCount: number; isLoadingCount: boolean }>;
  filteredTabs: Tab[];
  groupedTabs: any;
  duplicateTabs: any;
  emptyTabs: Tab[];
  availableLanguages: string[];
  
  // UI state
  selectedTabIds: Set<string>;
  searchQuery: string;
  languageFilter: string[];
  sortOption: SortOption;
  groupOption: GroupOption;
  editingTabIdForModal: string | null;
  newWorkspaceName: string;
  isCreatingWorkspace: boolean;
  editingWorkspaceId: string | null;
  editingWorkspaceName: string;
  showMergeOptions: boolean;
  mergeDelimiter: string;
  showRenameOptions: boolean;
  renameBasePattern: string;
  renameSuffixPattern: string;
  
  // Drag & Drop state
  activeDragId: string | null;
  draggedTabIds: Set<string>;
  activeDragItemData: Tab | null;
  sensors: any;
  
  // Confirmation dialog state
  confirmationDialog: ConfirmationDialog;
  
  // Refs
  modalContentRef: React.RefObject<HTMLDivElement>;
  
  // Store data
  workspaces: any[];
  activeWorkspaceId: string | null;
  isTabManagementActionInProgress: boolean;
  
  // Setters
  setSelectedTabIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setLanguageFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  setGroupOption: React.Dispatch<React.SetStateAction<GroupOption>>;
  setNewWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  setIsCreatingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingWorkspaceId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingWorkspaceName: React.Dispatch<React.SetStateAction<string>>;
  setShowMergeOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setMergeDelimiter: React.Dispatch<React.SetStateAction<string>>;
  setShowRenameOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setRenameBasePattern: React.Dispatch<React.SetStateAction<string>>;
  setRenameSuffixPattern: React.Dispatch<React.SetStateAction<string>>;
  setConfirmationDialog: React.Dispatch<React.SetStateAction<ConfirmationDialog>>;
  
  // Event handlers
  handleStartEditingTab: (tabId: string) => void;
  handleSaveTabTitle: (tabId: string, newTitle: string) => void;
  handleCancelEditingTab: () => void;
  handleSelectTab: (tabId: string, multiSelect: boolean) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleDoubleClickTab: (tabId: string) => void;
  handleModifiedApplyCurrentOrder: (eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]) => void;
  handleCloseTabs: () => void;
  handleTogglePinSelectedTabs: () => void;
  handleDuplicateTabs: () => void;
  handleBulkRename: () => void;
  handleMergeTabs: () => void;
  handleCreateWorkspace: () => void;
  handleRenameWorkspace: () => void;
  handleDeleteWorkspace: (workspaceId: string) => void;
  handleRemoveDuplicates: () => void;
  handleRemoveEmptyTabs: () => void;
  handleSwitchWorkspaceAndKeepModal: (workspaceId: string, event: React.MouseEvent) => void;
  handleBaseModalClose: () => void;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export const useTabManagementEngine = (isOpen: boolean, onClose: () => void): TabManagementEngine => {
  console.log(`[TabManagementEngine] Hook called with isOpen: ${isOpen}`);
  
  // *** CRITICAL FIX: Do NOT use hooks here. We will get state imperatively. ***
  // const { removeTab, ... } = useRootStore(); // <--- REMOVE THIS
  // const { workspaces, ... } = useWorkspaceStore(); // <--- REMOVE THIS

  // *** NEW: Local state for tabs, only updated when modal opens ***
  const [localTabs, setLocalTabs] = useState<Tab[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // Other states remain the same
  const storage = StorageProviderFactory.getProvider();
  const [allApplicationTabs, setAllApplicationTabs] = useState<Tab[]>([]);
  const [isLoadingAllTabs, setIsLoadingAllTabs] = useState(false);
  const [editingTabIdForModal, setEditingTabIdForModal] = useState<string | null>(null);
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggedTabIds, setDraggedTabIds] = useState<Set<string>>(new Set());
  const [activeDragItemData, setActiveDragItemData] = useState<Tab | null>(null);
  const { cacheSplitViewForWorkspace } = useCacheStore();
  const { isLocked: isTabManagementActionInProgress, withLock: withActionLock } = useActionLock();

  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialog>({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', onConfirm: () => {}, isDestructive: false
  });
  
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // *** EFFECT: Populate local state only when modal opens ***
  useEffect(() => {
    console.log(`[TabManagementEngine] useEffect triggered - isOpen: ${isOpen}`);
    
    if (isOpen) {
      console.log(`[TabManagementEngine] Modal opening - fetching fresh state from stores`);
      
      // Fetch the LATEST state directly from the store when opening
      const currentActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const allTabs = useTabsStore.getState().tabs;
      const activeTabs = allTabs.filter(tab => tab.workspaceId === currentActiveWorkspaceId);
      
      console.log(`[TabManagementEngine] Fetched ${activeTabs.length} tabs for workspace ${currentActiveWorkspaceId}`);
      console.log(`[TabManagementEngine] Total content size: ${activeTabs.reduce((sum, tab) => sum + tab.content.length, 0)} bytes`);
      
      setLocalTabs(activeTabs);
      setWorkspaces(useWorkspaceStore.getState().workspaces);
      setActiveWorkspaceId(currentActiveWorkspaceId);
      
      // Reset other UI states
      setSelectedTabIds(new Set());
      setSearchQuery('');
      setLanguageFilter([]);
      setSortOption('current');
      
      console.log(`[TabManagementEngine] Local state populated and UI reset`);
    } else {
      console.log(`[TabManagementEngine] Modal closing - clearing local state`);
      // Clear local state when modal closes to free memory
      setLocalTabs([]);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
    }
  }, [isOpen]); // This effect ONLY runs when the modal opens or closes

  // Fetch ALL application tabs when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(`[TabManagementEngine] Fetching all application tabs`);
      setIsLoadingAllTabs(true);
      storage.getTabs()
        .then(fetchedTabs => {
          console.log(`[TabManagementEngine] Fetched ${fetchedTabs.length} total application tabs`);
          setAllApplicationTabs(fetchedTabs);
        })
        .catch(err => {
          console.error("[TabManagementEngine] Failed to fetch all tabs:", err);
        })
        .finally(() => {
          setIsLoadingAllTabs(false);
        });
    }
  }, [isOpen, storage]);

  const availableLanguages = useMemo(() => {
    console.log(`[TabManagementEngine] Computing available languages from ${localTabs.length} local tabs`);
    const languages = new Set<string>();
    localTabs.forEach(tab => {
      if (tab.isTablet) languages.add('tablet');
      else languages.add(tab.language);
    });
    const result = Array.from(languages).sort();
    console.log(`[TabManagementEngine] Available languages: ${result.join(', ')}`);
    return result;
  }, [localTabs]);

  const workspacesWithCounts = useMemo(() => {
    console.log(`[TabManagementEngine] Computing workspace counts`);
    if (isLoadingAllTabs) {
      return workspaces.map(ws => ({ ...ws, tabCount: 0, isLoadingCount: true }));
    }
    return workspaces.map(ws => ({
      ...ws,
      tabCount: allApplicationTabs.filter(tab => tab.workspaceId === ws.id).length,
      isLoadingCount: false,
    }));
  }, [workspaces, allApplicationTabs, isLoadingAllTabs]);

  // *** MODIFIED: These hooks now use `localTabs` and will only re-run when the modal is open and its internal state changes ***
  console.log(`[TabManagementEngine] Computing expensive operations with ${localTabs.length} local tabs`);
  
  const filteredTabs = useFilteredTabs(localTabs, activeWorkspaceId, searchQuery, languageFilter, sortOption);
  const groupedTabs = useGroupedTabs(filteredTabs, groupOption, workspaces, languageRegistry);
  const duplicateTabs = useDuplicateTabs(localTabs, activeWorkspaceId);
  const emptyTabs = useEmptyTabs(localTabs, activeWorkspaceId);

  console.log(`[TabManagementEngine] Expensive computations completed:`);
  console.log(`  - Filtered tabs: ${filteredTabs.length}`);
  console.log(`  - Duplicate groups: ${Object.keys(duplicateTabs).length}`);
  console.log(`  - Empty tabs: ${emptyTabs.length}`);

  useModalClickOutside(modalContentRef, isOpen, () => {
    if (!confirmationDialog.isOpen) onClose();
  });

  useEffect(() => {
    setSelectedTabIds(new Set());
  }, [activeWorkspaceId]);

  const setTabManagementActionInProgress = (value: boolean) => {};

  const handleMoveToWorkspaceWithId = createMoveToWorkspaceWithIdHandler(
    activeWorkspaceId, allApplicationTabs, setTabManagementActionInProgress,
    setAllApplicationTabs, setDraggedTabIds, cacheSplitViewForWorkspace
  );

  const handleStartEditingTab = (tabId: string) => setEditingTabIdForModal(tabId);
  
  const handleSaveTabTitle = (tabId: string, newTitle: string) => {
    useRootStore.getState().updateTabTitle(tabId, newTitle);
    setEditingTabIdForModal(null);
  };
  
  const handleCancelEditingTab = () => setEditingTabIdForModal(null);

  const handleSelectTab = (tabId: string, multiSelect: boolean) => {
    setSelectedTabIds(prev => {
      const newSelection = new Set(prev);
      if (multiSelect) {
        if (newSelection.has(tabId)) newSelection.delete(tabId);
        else newSelection.add(tabId);
      } else {
        newSelection.clear();
        newSelection.add(tabId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => setSelectedTabIds(new Set(filteredTabs.map(tab => tab.id)));
  const handleDeselectAll = () => setSelectedTabIds(new Set());

  const handleDoubleClickTab = (tabId: string) => {
    const tab = localTabs.find(t => t.id === tabId);
    if (tab) {
      const { splitView, setActiveLeftTab, setActiveRightTab } = useRootStore.getState();
      if (splitView.leftTabs.includes(tabId)) setActiveLeftTab(tabId);
      else if (splitView.rightTabs.includes(tabId)) setActiveRightTab(tabId);
      else setActiveLeftTab(tabId);
      onClose();
    }
  };

  const handleModifiedApplyCurrentOrder = (eventOrTabs: React.MouseEvent<HTMLButtonElement> | Tab[]) => {
    setSortOption(applyCurrentOrderHelper(eventOrTabs, filteredTabs) as SortOption);
  };

  const handleCloseTabs = () => {
    if (selectedTabIds.size === 0) return;
    setConfirmationDialog({
      isOpen: true, title: 'Close Tabs', message: `Are you sure you want to close ${selectedTabIds.size} tab(s)? This action cannot be undone.`,
      confirmText: 'Close Tabs', cancelText: 'Cancel',
      onConfirm: () => {
        selectedTabIds.forEach(id => useRootStore.getState().removeTab(id));
        setSelectedTabIds(new Set());
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleTogglePinSelectedTabs = () => {
    if (selectedTabIds.size === 0) return;
    let actionIsPin = false;
    const firstTab = localTabs.find(t => t.id === Array.from(selectedTabIds)[0]);
    if (firstTab) actionIsPin = !firstTab.isPinned;
    selectedTabIds.forEach(id => {
      const tab = localTabs.find(t => t.id === id);
      if (tab) {
        if (selectedTabIds.size === 1 || (actionIsPin && !tab.isPinned) || (!actionIsPin && tab.isPinned)) {
          useRootStore.getState().toggleTabPin(id);
        }
      }
    });
  };

  const handleDuplicateTabs = () => {
    if (selectedTabIds.size === 0) return;
    const selected = localTabs.filter(tab => selectedTabIds.has(tab.id));
    selected.forEach(tab => {
      const newTabId = useRootStore.getState().duplicateTab(tab.id, false);
      useRootStore.getState().updateTabTitle(newTabId, `${tab.title} (copy)`);
    });
    setSelectedTabIds(new Set());
  };

  const handleBulkRename = () => {
    if (selectedTabIds.size === 0 || !renameBasePattern.trim()) return;
    const selected = localTabs.filter(tab => selectedTabIds.has(tab.id));
    selected.forEach((tab, index) => {
      const suffix = renameSuffixPattern.replace('{d}', (index + 1).toString());
      const newTitle = renameBasePattern.trim() + suffix;
      useRootStore.getState().updateTabTitle(tab.id, newTitle);
    });
    setShowRenameOptions(false);
    setRenameBasePattern('');
    setSelectedTabIds(new Set());
  };

  const handleMergeTabs = () => {
    if (selectedTabIds.size < 2) return;
    const selected = localTabs.filter(tab => selectedTabIds.has(tab.id));
    if (!selected.every(tab => !tab.isTablet)) {
      alert('Only text-based tabs can be merged.');
      return;
    }
    const sorted = [...selected].sort((a, b) => a.title.localeCompare(b.title));
    let processedDelimiter = mergeDelimiter.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    const mergedContent = sorted.map(tab => tab.content).join(processedDelimiter);
    useRootStore.getState().addTab({
      id: crypto.randomUUID(), title: 'Merged Tabs', content: mergedContent, language: 'plaintext',
      languageLocked: false, cursorPosition: { lineNumber: 1, column: 1 }, dateCreated: Date.now(),
      lastModified: Date.now(), workspaceId: activeWorkspaceId || ''
    });
    selectedTabIds.forEach(id => useRootStore.getState().removeTab(id));
    setShowMergeOptions(false);
    setSelectedTabIds(new Set());
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) return;
    useWorkspaceStore.getState().createWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setIsCreatingWorkspace(false);
  };

  const handleRenameWorkspace = () => {
    if (!editingWorkspaceId || !editingWorkspaceName.trim()) return;
    useWorkspaceStore.getState().renameWorkspace(editingWorkspaceId, editingWorkspaceName.trim());
    setEditingWorkspaceId(null);
    setEditingWorkspaceName('');
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    const workspace = useWorkspaceStore.getState().workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    setConfirmationDialog({
      isOpen: true, title: 'Delete Workspace', message: `Are you sure you want to delete "${workspace.name}"? All its tabs will be deleted.`,
      confirmText: 'Delete Workspace', cancelText: 'Cancel',
      onConfirm: () => {
        useWorkspaceStore.getState().deleteWorkspace(workspaceId);
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: true
    });
  };

  const handleRemoveDuplicates = () => {
    const groups = Object.values(duplicateTabs);
    if (groups.length === 0) return;
    setConfirmationDialog({
      isOpen: true, title: 'Remove Duplicate Tabs', message: `Found ${groups.length} groups of duplicates. Keep the newest from each group?`,
      confirmText: 'Remove Duplicates', cancelText: 'Cancel',
      onConfirm: () => {
        groups.forEach(group => {
          const sorted = [...(group as Tab[])].sort((a, b) => b.lastModified - a.lastModified);
          for (let i = 1; i < sorted.length; i++) useRootStore.getState().removeTab(sorted[i].id);
        });
        setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRemoveEmptyTabs = () => {
    if (emptyTabs.length === 0) return;
    emptyTabs.forEach(tab => useRootStore.getState().removeTab(tab.id));
  };
  
  const handleSwitchWorkspaceAndKeepModal = (workspaceId: string, event: React.MouseEvent) => {
    withActionLock(async () => {
        await useWorkspaceStore.getState().switchWorkspace(workspaceId);
    });
  };

  const handleBaseModalClose = () => closeModalHelper(onClose, isTabManagementActionInProgress);
  
  const handleDragStart = (event: DragStartEvent) => {
      const { active } = event;
      const tabId = active.id as string;
      const draggedTab = allApplicationTabs.find(t => t.id === tabId);
      if (!draggedTab) return;
      setActiveDragId(tabId);
      setActiveDragItemData(draggedTab);
      setDraggedTabIds(selectedTabIds.has(tabId) ? new Set(selectedTabIds) : new Set([tabId]));
  };

  const handleDragEnd = (event: DragEndEvent) => dragEndHelper(event, setActiveDragId, setDraggedTabIds, draggedTabIds, activeWorkspaceId, filteredTabs, handleMoveToWorkspaceWithId, handleModifiedApplyCurrentOrder);

  console.log(`[TabManagementEngine] Hook execution completed - returning engine object`);

  return {
    allApplicationTabs, isLoadingAllTabs, activeWorkspaceTabs: localTabs, workspacesWithCounts, filteredTabs,
    groupedTabs, duplicateTabs, emptyTabs, availableLanguages, selectedTabIds, searchQuery, languageFilter,
    sortOption, groupOption, editingTabIdForModal, newWorkspaceName, isCreatingWorkspace, editingWorkspaceId,
    editingWorkspaceName, showMergeOptions, mergeDelimiter, showRenameOptions, renameBasePattern, renameSuffixPattern,
    activeDragId, draggedTabIds, activeDragItemData, sensors, confirmationDialog, modalContentRef, workspaces,
    activeWorkspaceId, isTabManagementActionInProgress, setSelectedTabIds, setSearchQuery, setLanguageFilter,
    setSortOption, setGroupOption, setNewWorkspaceName, setIsCreatingWorkspace, setEditingWorkspaceId,
    setEditingWorkspaceName, setShowMergeOptions, setMergeDelimiter, setShowRenameOptions, setRenameBasePattern,
    setRenameSuffixPattern, setConfirmationDialog, handleStartEditingTab, handleSaveTabTitle, handleCancelEditingTab,
    handleSelectTab, handleSelectAll, handleDeselectAll, handleDoubleClickTab, handleModifiedApplyCurrentOrder,
    handleCloseTabs, handleTogglePinSelectedTabs, handleDuplicateTabs, handleBulkRename, handleMergeTabs,
    handleCreateWorkspace, handleRenameWorkspace, handleDeleteWorkspace, handleRemoveDuplicates, handleRemoveEmptyTabs,
    handleSwitchWorkspaceAndKeepModal, handleBaseModalClose, handleDragStart, handleDragEnd
  };
}; 