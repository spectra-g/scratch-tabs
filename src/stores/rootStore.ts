import { create } from 'zustand';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { useEditorStore } from './editorStore';
import { useWorkspaceStore } from './workspaceStore';
// import { usePersistenceStore } from './persistenceStore'; // Keep if needed for saveState
import { EditorPosition, Tab } from '../types';
import { languageRegistry } from '../languages/registry';

import {
  isTabEmpty,
  countEmptyTabs,
  groupTabsByLanguage
} from '../utils';
import { detectLanguage, isAmbiguousLanguage } from "../languages";
import { StorageProviderFactory } from '../db';

// Define the combined store interface
interface RootStore {
  // Tab management
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab, toRightSide?: boolean) => void;
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
  // saveTabs: (tabs: Tab[]) => void;
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
  unsplitScreen: (fromRight: boolean) => void;
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
}

export const useRootStore = create<RootStore>((set, get) => {
  // Get the individual stores
  const splitViewStore = useSplitViewStore.getState();
  const editorStore = useEditorStore.getState();
  // const persistenceStore = usePersistenceStore.getState(); // Keep if using saveState from here
  const storage = StorageProviderFactory.getProvider();
  // const { deleteWorkspace, getActiveWorkspace } = useWorkspaceStore.getState(); // Already available via get()

  // --- REMOVE Persistence Initialization Call ---
  // persistenceStore.initialize(); // REMOVE THIS LINE

  // --- Set up auto-save interval ---
  // This can stay, but ensure saveState works correctly (see step 5)
  // setInterval(() => {
  //   usePersistenceStore.getState().saveState(); // Check if saveState needs refinement
  // }, 10000); // Save every 10 seconds

  // --- REMOVE Event Listeners ---
  // window.removeEventListener('loadPersistedTabs', ...); // REMOVE
  // window.removeEventListener('loadPersistedSplitView', ...); // REMOVE
  // window.removeEventListener('requestSaveState', ...); // REMOVE (if saveState is handled differently)
  // Set up event listeners for persistence
  //     window.addEventListener('loadPersistedTabs', ((event: CustomEvent) => {
  //         useTabsStore.setState({ tabs: event.detail });
  //     }) as EventListener);
  //
  //     window.addEventListener('loadPersistedSplitView', ((event: CustomEvent) => {
  //         useSplitViewStore.setState({ splitView: event.detail });
  //     }) as EventListener);
  //
  //     window.addEventListener('requestSaveState', ((event: CustomEvent) => {
  //         const tabs = useTabsStore.getState().tabs;
  //         const splitView = useSplitViewStore.getState().splitView;
  //         event.detail.callback(tabs, splitView);
  //     }) as EventListener);

  // Set up subscriptions to keep the root store in sync with individual stores
  useTabsStore.subscribe((state) => {
    set({ tabs: state.tabs });
  });

  useSplitViewStore.subscribe((state) => {
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
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide);
      // Ensure active tab is set correctly after adding
      const { setActiveLeftTab, setActiveRightTab } = useSplitViewStore.getState();
      if (toRightSide) {
        setActiveRightTab(tab.id);
      } else {
        setActiveLeftTab(tab.id);
      }
    },
    addBackgroundTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addBackgroundTab(tab);
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide); // Don't activate
    },

    handleNewTab: async (isRightSide: boolean, content?: string) => {
      const { canAddNewTab, addTab } = get();

      if (!canAddNewTab(isRightSide)) {
        return;
      }

      // Ensure a workspace exists and get its ID
      const ensuredWorkspaceId = await useWorkspaceStore.getState().ensureWorkspace();
      if (!ensuredWorkspaceId) {
          console.error("[handleNewTab] Failed to ensure an active workspace. Cannot create tab.");
          return;
      }

      // Get the latest count of tabs from tabsStore *after* workspace ensures, as it might have loaded tabs
      const currentTabsCount = useTabsStore.getState().tabs.filter(t => t.workspaceId === ensuredWorkspaceId).length;


      const language = content ? detectLanguage(content) : 'plaintext';
      const shouldLock = language !== 'plaintext' && !isAmbiguousLanguage(content || '');
      const newTabId = crypto.randomUUID();

      const newTab: Tab = {
        id: newTabId,
        title: `new ${currentTabsCount + 1}`,
        content: content || '',
        language,
        languageLocked: shouldLock,
        workspaceId: ensuredWorkspaceId, // Use the ensured active workspace ID
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 }
      };
      addTab(newTab, isRightSide); // This already handles tabsStore and splitViewStore updates
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
            console.log(`Deleting workspace ${currentActiveWorkspaceId} as it's now empty.`);
            await useWorkspaceStore.getState().deleteWorkspace(currentActiveWorkspaceId);
          }
        }
      };
      checkAndDeleteWorkspace();
    },
    setActiveTab: (id: string) => { // This might be less used now, activation happens via setActiveLeft/RightTab
      const { splitView } = get();
      if (splitView.leftTabs.includes(id)) {
        useSplitViewStore.getState().setActiveLeftTab(id);
      } else if (splitView.rightTabs.includes(id)) {
        useSplitViewStore.getState().setActiveRightTab(id);
      } else {
        // If tab not found in current split view (e.g., after unsplit), default to left
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
        let allCurrentTabs = useTabsStore.getState().tabs; // Get latest tabs state

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
    unsplitScreen: (fromRight) => useSplitViewStore.getState().unsplitScreen(fromRight),
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
      return newTabId;
    },
    duplicateAndSplitTab: (tabId) => {
      const newTabId = get().duplicateTab(tabId, true); // Duplicate to right side
      if (!newTabId) return '';
      get().splitScreen(tabId, newTabId); // Split with original on left, new on right
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
      if (splitView.isSplit) {
        const targetList = toRightSide ? splitView.rightTabs : splitView.leftTabs;
        return targetList.filter(id => isTabEmpty(tabs.find(t => t.id === id))).length < 3;
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
  };
});