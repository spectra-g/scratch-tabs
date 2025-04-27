import { create } from 'zustand';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { useEditorStore } from './editorStore';
import { usePersistenceStore } from './persistenceStore';
import { EditorPosition, Tab } from '../types';
import { languageRegistry } from '../languages/registry';

import {
  findTabById,
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
  setActiveSide: (string: string) => void;
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
  const tabsStore = useTabsStore.getState();
  const splitViewStore = useSplitViewStore.getState();
  const editorStore = useEditorStore.getState();
  const persistenceStore = usePersistenceStore.getState();
  const storage = StorageProviderFactory.getProvider();

  // Initialize persistence
  persistenceStore.initialize();

  // Set up auto-save interval
  setInterval(() => {
    persistenceStore.saveState();
  }, 10000); // Save every 10 seconds

  // Set up event listeners for persistence
  window.addEventListener('loadPersistedTabs', ((event: CustomEvent) => {
    useTabsStore.setState({tabs: event.detail});
  }) as EventListener);

  window.addEventListener('loadPersistedSplitView', ((event: CustomEvent) => {
    useSplitViewStore.setState({splitView: event.detail});
  }) as EventListener);

  window.addEventListener('requestSaveState', ((event: CustomEvent) => {
    const tabs = useTabsStore.getState().tabs;
    const splitView = useSplitViewStore.getState().splitView;
    event.detail.callback(tabs, splitView);
  }) as EventListener);

  // Set up subscriptions to keep the root store in sync with individual stores
  useTabsStore.subscribe((state) => {
    set({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    });
  });

  useSplitViewStore.subscribe((state) => {
    set({
      splitView: state.splitView,
    });
  });

  useEditorStore.subscribe((state) => {
    set({
      previewMode: state.previewMode,
    });
  });

  return {
    // Initial state from individual stores
    tabs: tabsStore.tabs,
    activeTabId: tabsStore.activeTabId,
    previewMode: editorStore.previewMode,
    splitView: splitViewStore.splitView,

    // Tab management functions
    addTab: (tab, toRightSide = false) => {
      // Add the tab to the tabs store
      useTabsStore.getState().addTab(tab);

      // Add the tab to the appropriate side in split view
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide);
    },

    addBackgroundTab: (tab, toRightSide = false) => {
      const { activeTabId } = get();

      // Add the tab to the tabs store
      useTabsStore.getState().addBackgroundTab(tab);

      // Add the tab to the appropriate side in split view
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide, activeTabId ?? undefined);
    },

    handleNewTab: (isRightSide: boolean, content?: string) => {
      const {tabs, canAddNewTab, addTab} = get();

      // Check if we can add a new tab
      if (!canAddNewTab(isRightSide)) {
        return;
      }

      // Detect language if content is provided
      const language = content ? detectLanguage(content) : 'plaintext';
      const shouldLock = language !== 'plaintext' && !isAmbiguousLanguage(content || '');

      addTab({
        id: crypto.randomUUID(),
        title: `new ${tabs.length + 1}`,
        content: content || '',
        language,
        languageLocked: shouldLock
      }, isRightSide);
    },

    handleNewTabFromPaste: (isRightSide: boolean) => {
      const {handleNewTab} = get();

      async function paste() {
        return await navigator.clipboard.readText();
      }

      paste().then(content => handleNewTab(isRightSide, content));
    },

    removeTab: async (id) => {
      // Remove the tab from the split view
      useSplitViewStore.getState().removeTabFromSide(id);

      // Remove the tab from the tabs store
      useTabsStore.getState().removeTab(id);

      // Delete the tab from persistence
      await storage.deleteTab(id);
    },

    setActiveTab: (id) => {
      const {splitView} = get();

      // Set the active tab in the tabs store
      useTabsStore.getState().setActiveTab(id);

      // Set the active tab in the appropriate side of the split view
      if (splitView.isSplit) {
        if (splitView.leftTabs.includes(id)) {
          useSplitViewStore.getState().setActiveLeftTab(id);
        } else if (splitView.rightTabs.includes(id)) {
          useSplitViewStore.getState().setActiveRightTab(id);
        }
      }
    },

    updateTabContent: (id, content) => {
      useTabsStore.getState().updateTabContent(id, content);
    },

    updateTabLanguage: (id, language, lock = true) => {
      useTabsStore.getState().updateTabLanguage(id, language, lock);
    },

    updateTabTitle: (id, title) => {
      useTabsStore.getState().updateTabTitle(id, title);
    },

    updateTabState: (id, updates) => {
      useTabsStore.getState().updateTabState(id, updates);
    },

    // Editor state functions
    togglePreviewMode: () => {
      useEditorStore.getState().togglePreviewMode();
    },

    // Split view functions
    splitScreen: (leftTabId, rightTabId) => {
      const {tabs} = get();

      const removeTab = (tabId: string) => {
        return tabs
          .filter(tab => tab.id !== tabId)
          .map(tab => tab.id);
      }

      if (rightTabId) {
        // If a right tab is specified, use it directly
        useSplitViewStore.getState().splitScreen(removeTab(rightTabId), rightTabId);
      } else {
        // Get all tabs except the one being moved to the right
        useSplitViewStore.getState().splitScreen(removeTab(leftTabId), leftTabId);
      }
    },

    compareFromClipboard: async (originalTabId, isRightSide) => {
      const {splitView, addTab, setActiveLeftTab, setActiveRightTab} = get();
      const tabsStore = useTabsStore.getState();
      const splitViewStore = useSplitViewStore.getState();

      let clipboardContent = '';
      try {
        clipboardContent = await navigator.clipboard.readText();
      } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
        // Optionally show a user notification here
        return; // Stop if clipboard access fails
      }

      // Determine target side for the new tab
      const addNewTabToRight = !isRightSide;

      // Create the new tab data
      const language = detectLanguage(clipboardContent);
      const shouldLock = language !== 'plaintext' && !isAmbiguousLanguage(clipboardContent);
      const newTabId = crypto.randomUUID();
      const newTab: Tab = {
        id: newTabId,
        title: "Clipboard Compare",
        content: clipboardContent,
        language,
        languageLocked: shouldLock,
        cursorPosition: {
          lineNumber: 0,
          column: 0
        },
        isTablet: false, // Clipboard content is text, not a tablet
      };

      if (!splitView.isSplit) {
        // --- Handle case: Not currently split ---
        // 1. Add the new tab to the main store *first*
        tabsStore.addTab(newTab);

        // 2. Manually set up the split view state
        const updatedSplitView = {
          isSplit: true,
          leftTabs: [originalTabId], // Original tab goes to the left
          rightTabs: [newTabId],     // New clipboard tab goes to the right
          activeLeftTabId: originalTabId,
          activeRightTabId: newTabId,
          splitRatio: splitView.splitRatio, // Keep existing ratio or default
        };
        splitViewStore.setSplitView(updatedSplitView);

        // 3. Ensure the global active tab is set (optional, might depend on desired focus)
        // setActiveTab(originalTabId); // Or newTabId if you want focus on the new one

      } else {
        // --- Handle case: Already split ---
        // 1. Add the tab using the root store's addTab, specifying the side
        addTab(newTab, addNewTabToRight); // This should handle adding to the correct list and setting active state

        // 2. Explicitly ensure the new tab is active on its side (addTab might already do this, but being explicit is safer)
        if (addNewTabToRight) {
          setActiveRightTab(newTabId);
        } else {
          setActiveLeftTab(newTabId);
        }
        // 3. Ensure the original tab remains active on its side
        if (isRightSide) {
          setActiveRightTab(originalTabId);
        } else {
          setActiveLeftTab(originalTabId);
        }
      }
      // The diff modal opening will be handled by the onClose('compare') in the context menu config
    },

    reorderTabs: (side, newOrder) => {
        if (side === 'left') {
            useSplitViewStore.getState().setSplitView({
              leftTabs: newOrder
            });
        } else {
            useSplitViewStore.getState().setSplitView({
              rightTabs: newOrder
            });
        }
    },

    unsplitScreen: (fromRight) => {
      useSplitViewStore.getState().unsplitScreen(fromRight);

      // Set the active tab based on which side was active
      const {splitView} = useSplitViewStore.getState();
      if (fromRight) {
        useTabsStore.getState().setActiveTab(splitView.activeLeftTabId || '');
      } else {
        useTabsStore.getState().setActiveTab(splitView.activeRightTabId || '');
      }
    },

    moveTabToRight: (tabId) => {
      useSplitViewStore.getState().moveTabToRight(tabId);
      useTabsStore.getState().setActiveTab(tabId);
    },

    moveTabToLeft: (tabId) => {
      useSplitViewStore.getState().moveTabToLeft(tabId);
      useTabsStore.getState().setActiveTab(tabId);
    },

    setActiveLeftTab: (id) => {
      useSplitViewStore.getState().setActiveLeftTab(id);
      useTabsStore.getState().setActiveTab(id);
      set({
          focusedEditorSide: 'left'
      });
    },

    setActiveRightTab: (id) => {
      useSplitViewStore.getState().setActiveRightTab(id);
      useTabsStore.getState().setActiveTab(id);
      set({
          focusedEditorSide: 'right'
      });
    },

    setActiveSide: (side) => {
      useSplitViewStore.getState().setActiveSide(side);
    },

    setSplitRatio: (ratio) => {
      useSplitViewStore.getState().setSplitRatio(ratio);
    },

    // Bulk tab operations
    closeTabsToLeft: async (tabId, isRightSide) => {
      const {splitView} = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      if (tabIndex <= 0) return; // No tabs to the left

      // Get the tabs to close
      const tabsToClose = currentTabList.slice(0, tabIndex);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeTabsToLeft(tabId, isRightSide);

      // Remove the tabs from the tabs store and persistence
      for (const id of tabsToClose) {
        useTabsStore.getState().removeTab(id);
        await storage.deleteTab(id);
      }
    },

    toggleTabPin: (id: string) => {
      const { tabs, splitView } = get();
      const tab = findTabById(tabs, id);
      if (!tab) return;

      // Toggle the pin state
      const isPinned = !tab.isPinned;

      // Update the tab
      useTabsStore.getState().updateTabState(id, { isPinned });

      // If pinning, move to start of list after other pinned tabs
      if (isPinned) {
        const side = splitView.leftTabs.includes(id) ? 'left' : 'right';
        const currentList = side === 'left' ? splitView.leftTabs : splitView.rightTabs;

        // Find the last pinned tab index
        const lastPinnedIndex = currentList.findIndex(tabId => {
          const tab = findTabById(tabs, tabId);
          return !tab?.isPinned;
        });

        // Remove the tab from its current position
        const newList = currentList.filter(tabId => tabId !== id);

        // Insert after the last pinned tab (or at start if no pinned tabs)
        const insertIndex = lastPinnedIndex === -1 ? 0 : lastPinnedIndex;
        newList.splice(insertIndex, 0, id);

        // Update the split view
        if (side === 'left') {
          useSplitViewStore.getState().setSplitView({ leftTabs: newList });
        } else {
          useSplitViewStore.getState().setSplitView({ rightTabs: newList });
        }
      }
    },

    closeTabsToRight: async (tabId, isRightSide) => {
      const {splitView} = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      if (tabIndex === -1 || tabIndex === currentTabList.length - 1) return; // No tabs to the right

      // Get the tabs to close
      const tabsToClose = currentTabList.slice(tabIndex + 1);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeTabsToRight(tabId, isRightSide);

      // Remove the tabs from the tabs store and persistence
      for (const id of tabsToClose) {
        useTabsStore.getState().removeTab(id);
        await storage.deleteTab(id);
      }

      // Set the active tab
      if (isRightSide) {
        useSplitViewStore.getState().setActiveRightTab(tabId);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(tabId);
      }
      useTabsStore.getState().setActiveTab(tabId);
    },

    closeAllExcept: async (tabId, isRightSide) => {
      const {splitView} = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;

      if (currentTabList.length <= 1) return; // Only one tab, nothing to close

      // Get the tabs to close
      const tabsToClose = currentTabList.filter(id => id !== tabId);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeAllExcept(tabId, isRightSide);

      // Remove the tabs from the tabs store and persistence
      for (const id of tabsToClose) {
        useTabsStore.getState().removeTab(id);
        await storage.deleteTab(id);
      }

      // Set the active tab
      if (isRightSide) {
        useSplitViewStore.getState().setActiveRightTab(tabId);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(tabId);
      }
      useTabsStore.getState().setActiveTab(tabId);
    },

    duplicateTab: (tabId, isRightSide) => {
      // Duplicate the tab in the tabs store
      const newTabId = useTabsStore.getState().duplicateTab(tabId);

      if (!newTabId) return '';

      // Add the new tab to the appropriate side in split view
      const {splitView} = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      // Insert the new tab after the current tab
      const newTabList = [...currentTabList];
      newTabList.splice(tabIndex + 1, 0, newTabId);

      // Update the split view
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({
          rightTabs: newTabList,
          activeRightTabId: newTabId,
        });
      } else {
        useSplitViewStore.getState().setSplitView({
          leftTabs: newTabList,
          activeLeftTabId: newTabId,
        });
      }

      // Set the active tab
      useTabsStore.getState().setActiveTab(newTabId);

      return newTabId;
    },

    duplicateAndSplitTab: (tabId) => {
      const {duplicateTab, splitScreen} = get();

      const rightTabId = duplicateTab(tabId, true);
      splitScreen(tabId, rightTabId);
    },

    setCursorPosition: (tabId, cursorPosition) => {
      useTabsStore.getState().setCursorPosition(tabId, cursorPosition);
    },

    groupTabsByType: (isRightSide) => {
      const {tabs, splitView} = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;

      // Use the utility function to group tabs by language
      const groupedTabs = groupTabsByLanguage(tabs, currentTabList);

      // Update the split view
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({
          rightTabs: groupedTabs,
        });
      } else {
        useSplitViewStore.getState().setSplitView({
          leftTabs: groupedTabs,
        });
      }
    },

    // Tab limit checks
    canAddNewTab: (toRightSide = false) => {
      const {tabs, splitView} = get();

      // If in split view, check the appropriate side
      if (splitView.isSplit) {
        if (toRightSide) {
          // Check right side tabs
          const rightTabIds = splitView.rightTabs;
          const emptyRightTabs = rightTabIds.filter(id => {
            const tab = findTabById(tabs, id);
            return tab && isTabEmpty(tab);
          });

          return emptyRightTabs.length < 3;
        } else {
          // Check left side tabs
          const leftTabIds = splitView.leftTabs;
          const emptyLeftTabs = leftTabIds.filter(id => {
            const tab = findTabById(tabs, id);
            return tab && isTabEmpty(tab);
          });

          return emptyLeftTabs.length < 3;
        }
      } else {
        // Not in split view, check all tabs
        return countEmptyTabs(tabs) < 3;
      }
    },

    focusedEditorSide: null,
    saveTabDataById: (tabId: string) => {
        const { tabs } = get();

        if (!tabId) {
             return;
        }

        const tabToSave = tabs.find(tab => tab.id === tabId);

        if (!tabToSave) {
            return;
        }

        if (tabToSave.isTablet) {
            return;
        }

        try {
            const currentContent = tabToSave.content;
            const detector = languageRegistry.getById(tabToSave.language);
            const extension = detector?.getFileExtension() || 'txt';
            const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tabToSave.title}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`[Store Save] Error during save for Tab ID ${tabToSave.id}:`, error);
        }
    },
  };
});