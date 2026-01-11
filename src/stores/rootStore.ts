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
import { useQueryPanelStore } from "../formats/json/stores/useQueryPanelStore";
import { contentProcessingService } from "../services/contentProcessing";

// The RootStore now primarily holds ACTIONS that coordinate other stores.
// It does NOT hold mirrored state like `tabs` or `splitView`.
interface RootStore {
  // STATE for URL sync suppression (used during share tab creation)
  suppressUrlSync: boolean;
  setSuppressUrlSync: (suppress: boolean) => void;

  // ACTIONS ONLY
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  handleNewPopulatedTab: (tab: Partial<Tab>, toRightSide?: boolean) => Promise<string | undefined>;
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

/**
 * Extracts image data from clipboard if present
 */
const _extractImageFromClipboard = async (): Promise<string | null> => {
  const clipboardItems = await navigator.clipboard.read();
  
  for (const clipboardItem of clipboardItems) {
    for (const type of clipboardItem.types) {
      if (type.startsWith('image/')) {
        const imageBlob = await clipboardItem.getType(type);
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageBlob);
        });
      }
    }
  }
  
  return null;
};

/**
 * Creates a new rich text tab for image pasting
 */
const _createImageTab = async (
  imageDataUrl: string, 
  isRightSide: boolean, 
  storeActions: RootStore,
  createFinalTabObjectFn: (partialInputTab: Partial<Tab>, workspaceId: string, options: { defaultTitle: string; initialContent?: string }) => Tab
): Promise<void> => {
  const { canAddNewTab, addTab } = storeActions;
  if (!canAddNewTab(isRightSide)) return;
  
  // Store image data for the rich text editor
  const { useClipboardStore } = await import('./clipboardStore');
  useClipboardStore.getState().setPendingImageData(imageDataUrl);
  
  // Generate proper "Scratch n" title
  const ensuredWorkspaceId = await useWorkspaceStore.getState().ensureWorkspace();
  if (!ensuredWorkspaceId) return;
  
  const currentTabs = useTabsStore.getState().tabs.filter((t) => t.workspaceId === ensuredWorkspaceId);
  const nonWelcomeTabs = currentTabs.filter((tab) => tab.title !== "Welcome");
  const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;
  
  const newTabObject = createFinalTabObjectFn({
    isRich: true,
    content: '', // Rich text tabs use richContent, not content
    richContent: null, // Will be initialized by the editor with the pending image
  }, ensuredWorkspaceId, {
    defaultTitle,
  });
  
  addTab(newTabObject, isRightSide);
};

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
      richContent: partialInputTab.richContent || null,
      language: partialInputTab.language || language,
      languageLocked: partialInputTab.languageLocked ?? languageLocked,
      isRich: partialInputTab.isRich ?? false,
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

    // URL sync suppression (for share tab creation)
    suppressUrlSync: false,
    setSuppressUrlSync: (suppress) => set({ suppressUrlSync: suppress }),

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
      const { addTab } = get();
      // Populated tabs (tablets, rich text, or tabs with content) bypass the empty tab limit
      // Only check the limit if this is truly an empty scratch tab
      const isPopulated = tabInput.isTablet || tabInput.isRich || (tabInput.content && tabInput.content.length > 0);

      if (!isPopulated) {
        const { canAddNewTab } = get();
        if (!canAddNewTab(toRightSide)) {
          console.error('[handleNewPopulatedTab] Cannot add new tab - empty tab limit reached');
          return undefined;
        }
      }

      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();

      if (!ensuredWorkspaceId) {
        return undefined;
      }

      const newTabObject = _createFinalTabObject(tabInput, ensuredWorkspaceId, {
        defaultTitle: tabInput.title || "Populated Tab",
      });

      addTab(newTabObject, toRightSide);

      return newTabObject.id;
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

    handleNewTabFromPaste: async (isRightSide) => {
      try {
        const imageDataUrl = await _extractImageFromClipboard();
        if (imageDataUrl) {
          await _createImageTab(imageDataUrl, isRightSide, get(), _createFinalTabObject);
          return;
        }
        
        // No images found, fall back to text content
        const content = await navigator.clipboard.readText();
        get().handleNewTab(isRightSide, content);
      } catch (error) {
        // Fallback to text-only if clipboard API fails
        console.warn('Clipboard API failed, falling back to text:', error);
        navigator.clipboard
          .readText()
          .then((content) => get().handleNewTab(isRightSide, content))
          .catch(() => {
            // If even text reading fails, create an empty tab
            get().handleNewTab(isRightSide, '');
          });
      }
    },

    removeTab: (id) => {
      const tabToRemove = useTabsStore.getState().tabs.find((t) => t.id === id);
      if (!tabToRemove) return;

      modelManager.dispose(id);

      // Clean up query panel state for JSON tabs
      useQueryPanelStore.getState().removePanelState(id);

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
      const tabsToClose = useSplitViewStore.getState().getTabsToLeft(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;
      
      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeTabsToLeftRespectingPins(tabId, isRightSide, isPinnedTab);
      
      // Remove only unpinned tabs from data store
      tabsToClose.filter(id => !isPinnedTab(id)).forEach(id => get().removeTab(id));
    },
    closeTabsToRight: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getTabsToRight(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;
      
      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeTabsToRightRespectingPins(tabId, isRightSide, isPinnedTab);
      
      // Remove only unpinned tabs from data store
      tabsToClose.filter(id => !isPinnedTab(id)).forEach(id => get().removeTab(id));
    },
    closeAllExcept: (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getAllExcept(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;
      
      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeAllExceptRespectingPins(tabId, isRightSide, isPinnedTab);
      
      // Remove only unpinned tabs from data store
      tabsToClose.filter(id => !isPinnedTab(id)).forEach(id => get().removeTab(id));
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

      // Process clipboard content through content processing pipeline
      // This handles unstringifying JSON, formatting, etc. for all formats
      const { content: processedContent } = await contentProcessingService.processClipboardForComparison(
        clipboardContent,
        language
      );

      const newTabId = crypto.randomUUID();
      const now = Date.now();
      const newTab: Tab = {
        id: newTabId,
        title: "Clipboard Compare",
        content: processedContent, // Use processed content instead of raw clipboard
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
