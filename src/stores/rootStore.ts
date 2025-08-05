import { create } from "zustand";
import { useTabsStore } from "./tabsStore";
import { useSplitViewStore } from "./splitViewStore";
import { useEditorStore } from "./editorStore";
import { useWorkspaceStore } from "./workspaceStore";
import { Tab } from "../types";
import { formatRegistry } from "../formats/registry";
import { incrementSetting } from "../db";
import { NEW_TAB_PREFIX } from "../constants";
import { isTabEmpty, countEmptyTabs, groupTabsByLanguage } from "../utils";
import { detectFormat, isAmbiguousFormat } from "../formats";
import { StorageProviderFactory } from "../db";
import { broadcastManager } from "./broadcastStore";
import { modelManager } from "../services/modelManager";

// The RootStore now primarily holds ACTIONS that coordinate other stores.
// It does NOT hold mirrored state like `tabs` or `splitView`.
interface RootStore {
  // ACTIONS ONLY
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
  togglePreviewMode: () => void;
  splitScreen: (leftTabId: string, rightTabId?: string) => void;
  unsplitScreen: (tabId?: string) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: "left" | "right") => void;
  setSplitRatio: (ratio: number) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  duplicateTab: (tabId: string, isRightSide: boolean) => string;
  duplicateAndSplitTab: (tabId: string) => string;

  groupTabsByType: (isRightSide: boolean) => void;
  canAddNewTab: (toRightSide?: boolean) => boolean;
  compareFromClipboard: (
    originalTabId: string,
    isRightSide: boolean,
  ) => Promise<void>;
  reorderTabs: (side: "left" | "right", newOrder: string[]) => void;
  saveTabDataById: (tabId: string) => void;
  setActiveView: (tabId: string, viewId: string | null) => void;
  getActiveView: (tabId: string) => string | null;
  initialUrlProcessed: boolean;
  setInitialUrlProcessed: (status: boolean) => void;
}

export const useRootStore = create<RootStore>((set, get) => {
  // NO MORE SUBSCRIPTIONS HERE
  const storage = StorageProviderFactory.getProvider();

  const _createFinalTabObject = (
    partialInputTab: Partial<Tab>, // Input data, can be empty or partially filled
    workspaceId: string,
    options: {
      defaultTitle: string;
      initialContent?: string;
    },
  ): Tab => {
    const now = Date.now();
    // Use content from input, fallback to initialContent, then to empty string
    const content = partialInputTab.content ?? options.initialContent ?? "";

    const language = content ? detectFormat(content) : "plaintext";
    const languageLocked =
      language !== "plaintext" && !isAmbiguousFormat(content || "");

    const finalTab = {
      id: partialInputTab.id || crypto.randomUUID(),
      title: partialInputTab.title || options.defaultTitle,
      content: content,
      language: partialInputTab.language || language,
      languageLocked: partialInputTab.languageLocked ?? languageLocked,
      workspaceId: workspaceId,
      dateCreated: partialInputTab.dateCreated || now,
      lastModified: now,
      cursorPosition: partialInputTab.cursorPosition || {
        lineNumber: 1,
        column: 1,
      },
      isPinned: partialInputTab.isPinned || false,
      isTablet: partialInputTab.isTablet || false,
      tabletState: partialInputTab.tabletState || "",
      previewMode: partialInputTab.previewMode || false,
    };
    return finalTab;
  };

  return {
    // NO MORE STATE MIRRORING
    initialUrlProcessed: false,
    setInitialUrlProcessed: (status) => set({ initialUrlProcessed: status }),

    // ACTIONS
    addTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addTab(tab);
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide, tab.id);
      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );
      incrementSetting("tabs.created.total").catch((err) =>
        console.error("Failed to increment tab counter:", err),
      );
    },

    addBackgroundTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addBackgroundTab(tab);
      const currentTabId = toRightSide
        ? useSplitViewStore.getState().splitView.activeRightTabId
        : useSplitViewStore.getState().splitView.activeLeftTabId;
      useSplitViewStore
        .getState()
        .addTabToSide(tab.id, toRightSide, currentTabId || undefined);
    },

    handleNewPopulatedTab: async (tabInput, toRightSide = false) => {
      const { canAddNewTab, addTab } = get();
      if (!canAddNewTab(toRightSide)) return;
      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();
      if (!ensuredWorkspaceId) return;
      const newTabObject = _createFinalTabObject(tabInput, ensuredWorkspaceId, {
        defaultTitle: tabInput.title || "Populated Tab",
      });
      addTab(newTabObject, toRightSide);
    },

    handleNewTab: async (isRightSide, content) => {
      const { canAddNewTab, addTab } = get();
      if (!canAddNewTab(isRightSide)) return;
      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();
      if (!ensuredWorkspaceId) return;
      const currentTabs = useTabsStore
        .getState()
        .tabs.filter((t) => t.workspaceId === ensuredWorkspaceId);
      const nonWelcomeTabs = currentTabs.filter(
        (tab) => tab.title !== "Welcome",
      );
      const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;
      const newTabObject = _createFinalTabObject({}, ensuredWorkspaceId, {
        defaultTitle,
        initialContent: content,
      });
      addTab(newTabObject, isRightSide);
    },

    handleNewTabFromPaste: (isRightSide) => {
      navigator.clipboard
        .readText()
        .then((content) => get().handleNewTab(isRightSide, content));
    },

    removeTab: (id) => {
      const tabToRemove = useTabsStore.getState().tabs.find((t) => t.id === id);
      if (!tabToRemove) return;

      modelManager.dispose(id);

      useSplitViewStore.getState().removeTabFromSide(id);
      useTabsStore.getState().removeTab(id);
      storage
        .deleteTab(id)
        .catch((err) => console.error("Failed to delete tab from DB:", err));
      const checkAndDeleteWorkspace = async () => {
        const currentTabs = useTabsStore.getState().tabs;
        const currentActiveWorkspaceId =
          useWorkspaceStore.getState().activeWorkspaceId;
        if (currentActiveWorkspaceId === tabToRemove.workspaceId) {
          const remainingTabsInWorkspace = currentTabs.filter(
            (tab) => tab.workspaceId === currentActiveWorkspaceId,
          );
          if (remainingTabsInWorkspace.length === 0) {
            await useWorkspaceStore
              .getState()
              .deleteWorkspace(currentActiveWorkspaceId);
          }
        }
      };
      checkAndDeleteWorkspace();
      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );
    },

    setActiveTab: (id) => {
      const { splitView } = useSplitViewStore.getState();
      if (splitView.leftTabs.includes(id)) {
        useSplitViewStore.getState().setActiveLeftTab(id);
      } else if (splitView.rightTabs.includes(id)) {
        useSplitViewStore.getState().setActiveRightTab(id);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(id);
      }
    },

    updateTabContent: (id, content) =>
      useTabsStore.getState().updateTabContent(id, content),
    updateTabLanguage: (id, language, lock = true) =>
      useTabsStore.getState().updateTabLanguage(id, language, lock),
    updateTabTitle: (id, title) =>
      useTabsStore.getState().updateTabTitle(id, title),
    updateTabState: (id, updates) =>
      useTabsStore.getState().updateTabState(id, updates),

    toggleTabPin: (id) => {
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      const tab = tabs.find((t) => t.id === id);
      if (!tab) return;
      const isPinned = !tab.isPinned;
      useTabsStore.getState().updateTabState(id, { isPinned });
      if (isPinned) {
        const side = splitView.leftTabs.includes(id) ? "left" : "right";
        let currentList =
          side === "left" ? [...splitView.leftTabs] : [...splitView.rightTabs];
        const allCurrentTabs = useTabsStore.getState().tabs;
        let firstUnpinnedIndex = -1;
        for (let i = 0; i < currentList.length; i++) {
          const currentTab = allCurrentTabs.find(
            (t) => t.id === currentList[i],
          );
          if (currentTab && !currentTab.isPinned && currentList[i] !== id) {
            firstUnpinnedIndex = i;
            break;
          }
        }
        currentList = currentList.filter((tabId) => tabId !== id);
        const insertIndex =
          firstUnpinnedIndex === -1 ? currentList.length : firstUnpinnedIndex;
        currentList.splice(insertIndex, 0, id);
        if (side === "left")
          useSplitViewStore.getState().setSplitView({ leftTabs: currentList });
        else
          useSplitViewStore.getState().setSplitView({ rightTabs: currentList });
      }
    },

    updateTabOrder: (leftTabs, rightTabs) =>
      useSplitViewStore.getState().updateTabOrder(leftTabs, rightTabs),
    togglePreviewMode: () => useEditorStore.getState().togglePreviewMode(),

    splitScreen: (leftTabId, rightTabId) => {
      const { splitView } = useSplitViewStore.getState();

      // FIX: Only use tabs currently visible in the unsplit view, not all tabs from all workspaces
      let targetLeftIds: string[];
      let targetRightId: string;

      if (splitView.isSplit) {
        // Already split, shouldn't happen but handle gracefully
        return;
      }

      if (rightTabId) {
        // rightTabId is provided - put it on right, everything else on left
        targetLeftIds = splitView.leftTabs.filter((id) => id !== rightTabId);
        targetRightId = rightTabId;
      } else {
        // leftTabId is provided (from context menu) - put it on right, everything else on left
        targetLeftIds = splitView.leftTabs.filter((id) => id !== leftTabId);
        targetRightId = leftTabId;
      }

      if (!targetRightId) return;

      useSplitViewStore.getState().splitScreen(targetLeftIds, targetRightId);
    },

    unsplitScreen: (tabId) => useSplitViewStore.getState().unsplitScreen(tabId),
    moveTabToRight: (tabId) =>
      useSplitViewStore.getState().moveTabToRight(tabId),
    moveTabToLeft: (tabId) => useSplitViewStore.getState().moveTabToLeft(tabId),
    setActiveLeftTab: (id) => useSplitViewStore.getState().setActiveLeftTab(id),
    setActiveRightTab: (id) =>
      useSplitViewStore.getState().setActiveRightTab(id),
    setActiveSide: (side) => useSplitViewStore.getState().setActiveSide(side),
    setSplitRatio: (ratio) => useSplitViewStore.getState().setSplitRatio(ratio),

    // Bulk tab operations (delegate to splitViewStore)
    closeTabsToLeft: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore
        .getState()
        .getTabsToLeft(tabId, isRightSide); // Helper needed in splitViewStore
      
      // Filter out pinned tabs - they should not be closed
      const { tabs } = useTabsStore.getState();
      const unpinnedTabsToClose = tabsToClose.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return tab && !tab.isPinned;
      });
      
      // Instead of calling splitViewStore.closeTabsToLeft, manually update the split view
      const { splitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex <= 0) return; // No tabs to the left
      
      // Keep pinned tabs to the left, plus all tabs from current position onwards
      const tabsToTheLeft = currentTabList.slice(0, tabIndex);
      const pinnedTabsToTheLeft = tabsToTheLeft.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return tab && tab.isPinned;
      });
      const tabsFromCurrentOnwards = currentTabList.slice(tabIndex);
      const tabsToKeep = [...pinnedTabsToTheLeft, ...tabsFromCurrentOnwards];
      
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({ 
          rightTabs: tabsToKeep,
          rightTabHistory: (splitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      } else {
        useSplitViewStore.getState().setSplitView({ 
          leftTabs: tabsToKeep,
          leftTabHistory: (splitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      }
      
      // Remove the unpinned tabs from the data store
      unpinnedTabsToClose.forEach((id) => get().removeTab(id));
    },
    closeTabsToRight: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore
        .getState()
        .getTabsToRight(tabId, isRightSide); // Helper needed in splitViewStore
      
      // Filter out pinned tabs - they should not be closed
      const { tabs } = useTabsStore.getState();
      const unpinnedTabsToClose = tabsToClose.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return tab && !tab.isPinned;
      });
      
      // Instead of calling splitViewStore.closeTabsToRight, manually update the split view
      const { splitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex === -1 || tabIndex >= currentTabList.length - 1) return; // No tabs to the right
      
      // Keep all tabs up to and including current tab, plus pinned tabs to the right
      const tabsUpToCurrent = currentTabList.slice(0, tabIndex + 1);
      const tabsToTheRight = currentTabList.slice(tabIndex + 1);
      const pinnedTabsToTheRight = tabsToTheRight.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return tab && tab.isPinned;
      });
      const tabsToKeep = [...tabsUpToCurrent, ...pinnedTabsToTheRight];
      
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({ 
          rightTabs: tabsToKeep,
          rightTabHistory: (splitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      } else {
        useSplitViewStore.getState().setSplitView({ 
          leftTabs: tabsToKeep,
          leftTabHistory: (splitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      }
      
      // Remove the unpinned tabs from the data store
      unpinnedTabsToClose.forEach((id) => get().removeTab(id));
    },
    closeAllExcept: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore
        .getState()
        .getAllExcept(tabId, isRightSide); // Helper needed in splitViewStore
      
      // Filter out pinned tabs - they should not be closed
      const { tabs } = useTabsStore.getState();
      const unpinnedTabsToClose = tabsToClose.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return tab && !tab.isPinned;
      });
      
      // Instead of calling splitViewStore.closeAllExcept (which removes ALL other tabs),
      // manually update the split view to keep pinned tabs and the current tab
      const { splitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabsToKeep = currentTabList.filter((id) => {
        const tab = tabs.find((t) => t.id === id);
        return id === tabId || (tab && tab.isPinned);
      });
      
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({ 
          rightTabs: tabsToKeep,
          activeRightTabId: tabId,
          rightTabHistory: (splitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      } else {
        useSplitViewStore.getState().setSplitView({ 
          leftTabs: tabsToKeep,
          activeLeftTabId: tabId,
          leftTabHistory: (splitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id))
        });
      }
      
      // Remove the unpinned tabs from the data store
      unpinnedTabsToClose.forEach((id) => get().removeTab(id));
    },
    duplicateTab: (tabId, isRightSide = false) => {
      // Default to left if side not specified
      const newTabId = useTabsStore.getState().duplicateTab(tabId);
      if (!newTabId) return "";
      useSplitViewStore.getState().addTabToSide(newTabId, isRightSide, tabId); // Add next to original
      // Activate the new tab
      const { setActiveLeftTab, setActiveRightTab } =
        useSplitViewStore.getState();
      if (isRightSide) {
        setActiveRightTab(newTabId);
      } else {
        setActiveLeftTab(newTabId);
      }
      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );
      return newTabId;
    },
    duplicateAndSplitTab: (tabId) => {
      const newTabId = get().duplicateTab(tabId, true); // Duplicate to right side
      if (!newTabId) return "";
      get().splitScreen(tabId, newTabId); // Split with original on left, new on right
      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );
      return newTabId;
    },

    groupTabsByType: (isRightSide) => {
      // Logic might move to splitViewStore
      const { tabs } = useTabsStore.getState();
      const { splitView, setSplitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide
        ? splitView.rightTabs
        : splitView.leftTabs;
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
      } else if (splitView.isSplit) {
        const targetList = toRightSide
          ? splitView.rightTabs
          : splitView.leftTabs;
        return (
          targetList.filter((id) => {
            const tab = tabs.find((t) => t.id === id);
            return tab && isTabEmpty(tab);
          }).length < 3
        );
      } else {
        return countEmptyTabs(tabs) < 3;
      }
    },

    compareFromClipboard: async (originalTabId, isRightSide) => {
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      let clipboardContent = "";
      try {
        clipboardContent = await navigator.clipboard.readText();
      } catch (err) {
        console.error("Paste failed:", err);
        return;
      }
      const addNewTabToRight = !isRightSide;
      const language = detectFormat(clipboardContent);
      const shouldLock =
        language !== "plaintext" && !isAmbiguousFormat(clipboardContent);
      const newTabId = crypto.randomUUID();
      const now = Date.now();
      const newTab: Tab = {
        id: newTabId,
        title: "Clipboard Compare",
        content: clipboardContent,
        language,
        languageLocked: shouldLock,
        cursorPosition: { lineNumber: 1, column: 1 },
        isTablet: false,
        dateCreated: now,
        lastModified: now,
        workspaceId: activeWorkspaceId || "",
      };
      if (!splitView.isSplit) {
        get().addTab(newTab, true);
        get().splitScreen(originalTabId, newTabId);
      } else {
        get().addTab(newTab, addNewTabToRight);
        if (isRightSide) {
          useSplitViewStore.getState().setActiveRightTab(originalTabId);
        } else {
          useSplitViewStore.getState().setActiveLeftTab(originalTabId);
        }
      }
    },

    reorderTabs: (side, newOrder) =>
      useSplitViewStore.getState().reorderTabs(side, newOrder),

    saveTabDataById: (tabId) => {
      const { tabs } = useTabsStore.getState();
      if (!tabId) return;
      const tabToSave = tabs.find((tab) => tab.id === tabId);
      if (!tabToSave || tabToSave.isTablet) return;
      try {
        const detector = formatRegistry.getById(tabToSave.language);
        const extension = detector?.getFileExtension() || "txt";
        const blob = new Blob([tabToSave.content || ""], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tabToSave.title}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Save error Tab ID ${tabId}:`, error);
      }
    },

    setActiveView: (tabId, viewId) => {
      useTabsStore.getState().updateTabState(tabId, { activeViewId: viewId });
    },

    getActiveView: (tabId) => {
      const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
      return tab?.activeViewId || null;
    },
  };
});
