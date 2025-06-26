import { create } from 'zustand';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { useEditorStore } from './editorStore';
import { useWorkspaceStore } from './workspaceStore';
import { EditorPosition, Tab } from '../types';
import { languageRegistry } from '../languages/registry';
import { modelManager } from '../services/modelManager';
import { incrementSetting } from '../db';

import {
  isTabEmpty,
  countEmptyTabs,
  groupTabsByLanguage
} from '../utils';
import { detectLanguage, isAmbiguousLanguage } from "../languages";
import { StorageProviderFactory } from '../db';
import { broadcastManager } from './broadcastStore';

interface RootStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  handleNewPopulatedTab: (tab: Tab, toRightSide?: boolean) => void;
  addBackgroundTab: (tab: Tab, toRightSide?: boolean) => void;
  handleNewTab: (isRightSide: boolean, content?: string) => void;
  handleNewTabFromPaste: (isRightSide: boolean) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabState: (id: string, updates: Partial<Tab>) => void;
  toggleTabPin: (id: string) => void;
  updateTabOrder: (leftTabs: string[], rightTabs: string[]) => void;

  // Editor state
  previewMode: boolean;
  togglePreviewMode: () => void;

  // Split view
  splitView: {
    isSplit: boolean;
    leftTabs: string[];
    rightTabs: string[];
    activeLeftTabId: string | null;
    activeRightTabId: string | null;
    splitRatio: number;
    activeSide: string | null;
  };
  splitScreen: (leftTabId: string, rightTabId?: string) => void;
  unsplitScreen: () => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: string) => void;
  setSplitRatio: (ratio: number) => void;

  // Bulk tab operations
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  duplicateTab: (tabId: string, isRightSide: boolean) => string;
  duplicateAndSplitTab: (tabId: string) => string;
  setCursorPosition: (tabId: string, cursorPosition: EditorPosition) => void;
  groupTabsByType: (isRightSide: boolean) => void;

  // Tab limit checks
  canAddNewTab: (toRightSide?: boolean) => boolean;

  compareFromClipboard: (originalTabId: string, isRightSide: boolean) => Promise<void>;
  reorderTabs: (side: 'left' | 'right', newOrder: string[]) => void;
  focusedEditorSide: 'left' | 'right' | null;
  saveTabDataById: (tabId: string) => void;

  // Extended view management
  setActiveView: (tabId: string, viewId: string | null) => void;
  getActiveView: (tabId: string) => string | null;
}

export const useRootStore = create<RootStore>((set, get) => {
  const splitViewStore = useSplitViewStore.getState();
  const editorStore = useEditorStore.getState();
  const storage = StorageProviderFactory.getProvider();

  useTabsStore.subscribe((state) => {
    set({ tabs: state.tabs });
  });

  useSplitViewStore.subscribe((state) => {
    if (!state.splitView) return;
    const activeTabId = state.splitView.activeSide === 'right'
      ? state.splitView.activeRightTabId
      : state.splitView.activeLeftTabId;
    set({
      splitView: state.splitView,
      activeTabId: activeTabId,
    });
  });

  useEditorStore.subscribe((state) => {
    set({
      previewMode: state.previewMode,
    });
  });

  const _createFinalTabObject = (
    partialInputTab: Partial<Tab>, // Input data, can be empty or partially filled
    workspaceId: string,
    options: {
      defaultTitle: string;
      initialContent?: string;
    }
  ): Tab => {
    const now = Date.now();
    // Use content from input, fallback to initialContent, then to empty string
    const content = partialInputTab.content ?? options.initialContent ?? '';

    const language = content ? detectLanguage(content) : 'plaintext';
    const languageLocked = language !== 'plaintext' && !isAmbiguousLanguage(content || '');

    const finalTab = {
      id: partialInputTab.id || crypto.randomUUID(),
      title: partialInputTab.title || options.defaultTitle,
      content: content,
      language: partialInputTab.language || language,
      languageLocked: partialInputTab.languageLocked ?? languageLocked,
      workspaceId: workspaceId,
      dateCreated: partialInputTab.dateCreated || now,
      lastModified: now, 
      cursorPosition: partialInputTab.cursorPosition || { lineNumber: 1, column: 1 },
      isPinned: partialInputTab.isPinned || false,
      isTablet: partialInputTab.isTablet || false,
      tabletState: partialInputTab.tabletState || '',
      previewMode: partialInputTab.previewMode || false,
    };
    return finalTab;
  };

  return {
    // Initial state (will be quickly overwritten by loadWorkspaces)
    tabs: [],
    activeTabId: null,
    previewMode: editorStore.previewMode,
    splitView: splitViewStore.splitView,
    focusedEditorSide: null,

    // Tab management functions
    addTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addTab(tab);
      
      // Always make the new tab active
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide, tab.id);
      
      broadcastManager.broadcastWorkspaceState(useSplitViewStore.getState().splitView.workspaceId, {
        tabs: useTabsStore.getState().tabs,
        splitView: useSplitViewStore.getState().splitView,
      });
      
      // Increment the total tabs created counter
      incrementSetting('tabs.created.total').catch(err => 
        console.error("Failed to increment tab counter:", err)
      );
    },

    addBackgroundTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addBackgroundTab(tab);
      const currentTabId = toRightSide ? useSplitViewStore.getState().splitView.activeRightTabId : useSplitViewStore.getState().splitView.activeLeftTabId;
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide, currentTabId || undefined);
    },

    handleNewTab: async (isRightSide: boolean, content?: string) => {
      const { canAddNewTab, addTab } = get();

      if (!canAddNewTab(isRightSide)) {
        return;
      }

      const ensuredWorkspaceId = await useWorkspaceStore.getState().ensureWorkspace();
      if (!ensuredWorkspaceId) {
        console.error("[handleNewTab] Failed to ensure an active workspace. Cannot create tab.");
        return;
      }

      // Count tabs excluding the Welcome tab for proper numbering
      const currentTabs = useTabsStore.getState().tabs.filter(t => t.workspaceId === ensuredWorkspaceId);
      const nonWelcomeTabs = currentTabs.filter(tab => tab.title !== 'Welcome to Scratch Tabs');
      const defaultTitle = `new ${nonWelcomeTabs.length + 1}`;

      const newTabObject = _createFinalTabObject(
        {},
        ensuredWorkspaceId,
        {
          defaultTitle: defaultTitle,
          initialContent: content,
        }
      );
      addTab(newTabObject, isRightSide);
    },

    handleNewPopulatedTab: async (tabInput: Tab, toRightSide = false) => {
      const { canAddNewTab, addTab } = get();

      if (!canAddNewTab(toRightSide)) { 
        return;
      }

      const ensuredWorkspaceId = await useWorkspaceStore.getState().ensureWorkspace();
      if (!ensuredWorkspaceId) {
        console.error("[handleNewPopulatedTab] Failed to ensure an active workspace. Cannot create tab.");
        return;
      }

      // For populated tabs, we respect provided language/lock, but detect/derive if missing.
      const newTabObject = _createFinalTabObject(
        tabInput, // Pass the provided Tab object as the base
        ensuredWorkspaceId,
        {
          defaultTitle: tabInput.title || 'Populated Tab',
        }
      );
      addTab(newTabObject, toRightSide);
    },

    handleNewTabFromPaste: (isRightSide: boolean) => {
      navigator.clipboard.readText().then(content => {
        get().handleNewTab(isRightSide, content);
      }).catch(err => console.error("Paste failed:", err));
    },

    removeTab: (id: string) => {
      const { tabs } = get();
      const tabToRemove = tabs.find(t => t.id === id);
      if (!tabToRemove) return;

      modelManager.dispose(id);

      // 1. Remove from splitViewStore
      useSplitViewStore.getState().removeTabFromSide(id);
      // 2. Remove from tabsStore
      useTabsStore.getState().removeTab(id);
      // 3. Remove from DB
      storage.deleteTab(id).catch(err => console.error("Failed to delete tab from DB:", err));

      // 4. Check if workspace needs deletion (moved this logic from rootStore for clarity)
      const checkAndDeleteWorkspace = async () => {
        const currentTabs = useTabsStore.getState().tabs;
        const currentActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        if (currentActiveWorkspaceId === tabToRemove.workspaceId) {
          const remainingTabsInWorkspace = currentTabs.filter(tab => tab.workspaceId === currentActiveWorkspaceId);
          if (remainingTabsInWorkspace.length === 0) {
            await useWorkspaceStore.getState().deleteWorkspace(currentActiveWorkspaceId);
          }
        }
      };
      checkAndDeleteWorkspace();
      broadcastManager.broadcastWorkspaceState(useSplitViewStore.getState().splitView.workspaceId, {
        tabs: useTabsStore.getState().tabs,
        splitView: useSplitViewStore.getState().splitView,
      });
    },
    setActiveTab: (id: string) => {
      const { splitView } = get();
      if (splitView.leftTabs.includes(id)) {
        useSplitViewStore.getState().setActiveLeftTab(id);
      } else if (splitView.rightTabs.includes(id)) {
        useSplitViewStore.getState().setActiveRightTab(id);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(id);
      }
    },
    updateTabContent: (id, content) => useTabsStore.getState().updateTabContent(id, content),
    updateTabLanguage: (id, language, lock = true) => useTabsStore.getState().updateTabLanguage(id, language, lock),
    updateTabTitle: (id, title) => useTabsStore.getState().updateTabTitle(id, title),
    updateTabState: (id, updates) => useTabsStore.getState().updateTabState(id, updates),
    toggleTabPin: (id) => { // Keep complex logic here or move to utils
      const { tabs, splitView } = get();
      const tab = tabs.find(t => t.id === id);
      if (!tab) return;
      const isPinned = !tab.isPinned;
      useTabsStore.getState().updateTabState(id, { isPinned });

      if (isPinned) {
        const side = splitView.leftTabs.includes(id) ? 'left' : 'right';
        let currentList = side === 'left' ? [...splitView.leftTabs] : [...splitView.rightTabs];
        const allCurrentTabs = useTabsStore.getState().tabs; // Get latest tabs state

        // Find the index of the first unpinned tab
        let firstUnpinnedIndex = -1;
        for (let i = 0; i < currentList.length; i++) {
          const currentTab = allCurrentTabs.find(t => t.id === currentList[i]);
          if (currentTab && !currentTab.isPinned && currentList[i] !== id) { // Exclude the tab being pinned
            firstUnpinnedIndex = i;
            break;
          }
        }

        currentList = currentList.filter(tabId => tabId !== id); // Remove the tab

        // Insert at the beginning of unpinned tabs, or end if all are pinned
        const insertIndex = firstUnpinnedIndex === -1 ? currentList.length : firstUnpinnedIndex;
        currentList.splice(insertIndex, 0, id);

        if (side === 'left') {
          useSplitViewStore.getState().setSplitView({ leftTabs: currentList });
        } else {
          useSplitViewStore.getState().setSplitView({ rightTabs: currentList });
        }
      } else {
        // Unpinning - order might be handled differently or just keep its place
        // For simplicity, keep its current relative order among unpinned tabs
        // Or potentially move it based on lastModified/dateCreated if desired
      }
    },
    // saveTabs: (tabs) => useTabsStore.getState().saveTabs(tabs), // Likely less needed with auto-save
    updateTabOrder: (leftTabs, rightTabs) => useSplitViewStore.getState().updateTabOrder(leftTabs, rightTabs),

    // Editor state
    togglePreviewMode: () => useEditorStore.getState().togglePreviewMode(),

    // Split view
    splitScreen: (leftTabId, rightTabId) => {
      const { tabs } = useTabsStore.getState(); // Get current tabs
      const allTabIds = tabs.map(t => t.id);
      let targetLeftIds = allTabIds.filter(id => id !== rightTabId); // Default: all except the one moving right
      let targetRightId = rightTabId;

      if (!rightTabId) { // If only leftTabId provided, it moves right
        targetLeftIds = allTabIds.filter(id => id !== leftTabId);
        targetRightId = leftTabId;
      }
      if (!targetRightId) { // Need at least one tab on the right
        console.error("Split screen requires a tab ID for the right side.");
        return;
      }

      useSplitViewStore.getState().splitScreen(targetLeftIds, targetRightId);
    },
    unsplitScreen: () => useSplitViewStore.getState().unsplitScreen(),
    moveTabToRight: (tabId) => useSplitViewStore.getState().moveTabToRight(tabId),
    moveTabToLeft: (tabId) => useSplitViewStore.getState().moveTabToLeft(tabId),
    setActiveLeftTab: (id) => useSplitViewStore.getState().setActiveLeftTab(id),
    setActiveRightTab: (id) => useSplitViewStore.getState().setActiveRightTab(id),
    setActiveSide: (side) => useSplitViewStore.getState().setActiveSide(side),
    setSplitRatio: (ratio) => useSplitViewStore.getState().setSplitRatio(ratio),

    // Bulk tab operations (delegate to splitViewStore)
    closeTabsToLeft: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getTabsToLeft(tabId, isRightSide); // Helper needed in splitViewStore
      useSplitViewStore.getState().closeTabsToLeft(tabId, isRightSide);
      tabsToClose.forEach(id => get().removeTab(id)); // Call rootStore removeTab for full cleanup
    },
    closeTabsToRight: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getTabsToRight(tabId, isRightSide); // Helper needed in splitViewStore
      useSplitViewStore.getState().closeTabsToRight(tabId, isRightSide);
      tabsToClose.forEach(id => get().removeTab(id));
    },
    closeAllExcept: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getAllExcept(tabId, isRightSide); // Helper needed in splitViewStore
      useSplitViewStore.getState().closeAllExcept(tabId, isRightSide);
      tabsToClose.forEach(id => get().removeTab(id));
    },
    duplicateTab: (tabId, isRightSide = false) => { // Default to left if side not specified
      const newTabId = useTabsStore.getState().duplicateTab(tabId);
      if (!newTabId) return '';
      useSplitViewStore.getState().addTabToSide(newTabId, isRightSide, tabId); // Add next to original
      // Activate the new tab
      const { setActiveLeftTab, setActiveRightTab } = useSplitViewStore.getState();
      if (isRightSide) {
        setActiveRightTab(newTabId);
      } else {
        setActiveLeftTab(newTabId);
      }
      broadcastManager.broadcastWorkspaceState(useSplitViewStore.getState().splitView.workspaceId, {
        tabs: useTabsStore.getState().tabs,
        splitView: useSplitViewStore.getState().splitView,
      });
      return newTabId;
    },
    duplicateAndSplitTab: (tabId) => {
      const newTabId = get().duplicateTab(tabId, true); // Duplicate to right side
      if (!newTabId) return '';
      get().splitScreen(tabId, newTabId); // Split with original on left, new on right
      broadcastManager.broadcastWorkspaceState(useSplitViewStore.getState().splitView.workspaceId, {
        tabs: useTabsStore.getState().tabs,
        splitView: useSplitViewStore.getState().splitView,
      });
      return newTabId;
    },
    setCursorPosition: (tabId, cursorPosition) => useTabsStore.getState().setCursorPosition(tabId, cursorPosition),
    groupTabsByType: (isRightSide) => { // Logic might move to splitViewStore
      const { tabs } = useTabsStore.getState();
      const { splitView, setSplitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const groupedTabs = groupTabsByLanguage(tabs, currentTabList); // Use util

      if (isRightSide) {
        setSplitView({ rightTabs: groupedTabs });
      } else {
        setSplitView({ leftTabs: groupedTabs });
      }
    },

    // Tab limit checks (delegate)
    canAddNewTab: (toRightSide = false) => {
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      if (!splitView) {
        return true;
      }
      else if (splitView.isSplit) {
        const targetList = toRightSide ? splitView.rightTabs : splitView.leftTabs;
        return targetList.filter(id => {
          const tab = tabs.find(t => t.id === id);
          return tab && isTabEmpty(tab);
        }).length < 3;
      } else {
        return countEmptyTabs(tabs) < 3;
      }
    },

    compareFromClipboard: async (originalTabId, isRightSide) => {
      // Keep existing logic, but ensure it uses rootStore's addTab and activation
      const { splitView, addTab, setActiveLeftTab, setActiveRightTab, splitScreen } = get();
      const { activeWorkspaceId } = useWorkspaceStore.getState();

      let clipboardContent = '';
      try {
        clipboardContent = await navigator.clipboard.readText();
      } catch (err) { console.error("Paste failed:", err); return; }

      const addNewTabToRight = !isRightSide;
      const language = detectLanguage(clipboardContent);
      const shouldLock = language !== 'plaintext' && !isAmbiguousLanguage(clipboardContent);
      const newTabId = crypto.randomUUID();
      const now = Date.now();
      const newTab: Tab = {
        id: newTabId, title: "Clipboard Compare", content: clipboardContent, language,
        languageLocked: shouldLock, cursorPosition: { lineNumber: 1, column: 1 },
        isTablet: false, dateCreated: now, lastModified: now, workspaceId: activeWorkspaceId || ''
      };

      if (!splitView.isSplit) {
        // Add the new tab first (addTab handles splitView update internally now)
        addTab(newTab, true); // Add to right side initially
        // Now explicitly set up the split using the correct function
        splitScreen(originalTabId, newTabId); // This sets up the split view state correctly
      } else {
        addTab(newTab, addNewTabToRight); // Adds and activates
        // Ensure original tab is also active on its side
        if (isRightSide) {
          setActiveRightTab(originalTabId);
        } else {
          setActiveLeftTab(originalTabId);
        }
      }
    },

    reorderTabs: (side, newOrder) => useSplitViewStore.getState().reorderTabs(side, newOrder),

    // Save specific tab
    saveTabDataById: (tabId: string) => { // Keep existing logic
      const { tabs } = useTabsStore.getState();
      if (!tabId) return;
      const tabToSave = tabs.find(tab => tab.id === tabId);
      if (!tabToSave || tabToSave.isTablet) return;
      try {
        const detector = languageRegistry.getById(tabToSave.language);
        const extension = detector?.getFileExtension() || 'txt';
        const blob = new Blob([tabToSave.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tabToSave.title}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) { console.error(`Save error Tab ID ${tabId}:`, error); }
    },

    // Extended view management
    setActiveView: (tabId: string, viewId: string | null) => {
      useTabsStore.getState().updateTabState(tabId, { activeViewId: viewId });
    },

    getActiveView: (tabId: string) => {
      const tab = useTabsStore.getState().tabs.find(t => t.id === tabId);
      return tab?.activeViewId || null;
    },
  };
});