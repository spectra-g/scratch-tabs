import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useRootStore } from "../../stores/rootStore";
import { useBatchToolsStore } from "../../stores/batchToolsStore";
import {
  ChevronLeft,
  ChevronLeftSquare,
  ChevronRight,
  ChevronRightSquare,
  Copy,
  Edit3,
  FileCode,
  GitCompare,
  Layers,
  Maximize,
  Split,
  XCircle,
  ClipboardPaste,
  Pin,
  Download,
  History,
  ExternalLink,
} from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { formatRegistry } from "../../formats";
import { MenuItem } from "./types";
import { useState, useCallback } from "react";
import { ContextMenuAction, TabSide } from "../../constants";
import { modelManager } from "../../services/modelManager";

// Helper function to get the confirmation button text based on action type
const getConfirmButtonText = (type: string | null): string => {
  if (type === "close") return "Close Tab";
  if (type === "closeAllExcept") return "Close Others";
  if (type === "closeTabsToLeft") return "Close Left Tabs";
  if (type === "closeTabsToRight") return "Close Right Tabs";
  return "Confirm";
};

// Define the return type of the hook
export interface UseContextMenuConfigReturn {
  menuItems: MenuItem[];
  confirmationDialogProps: {
    isOpen: boolean;
    message: string;
    confirmButtonText: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}

// Hook implementation
export const useContextMenuConfig = (
  tabId: string, // This is the tab that was right-clicked
  isRightSide: boolean,
  closeContextMenu: (
    action?: ContextMenuAction,
    tabId?: string,
    explicitSide?: TabSide,
  ) => void,
  handleOpenDownloadAllModal?: () => void,
  startEditingTab?: (tabId: string) => void,
): UseContextMenuConfigReturn => {
  const tabsStore = useTabsStore();
  const splitViewStore = useSplitViewStore();
  const rootStore = useRootStore();

  const [confirmationState, setConfirmationState] = useState<{
    type: "close" | "closeAllExcept" | "closeTabsToLeft" | "closeTabsToRight";
    message: string;
    targetTabId: string;
  } | null>(null);

  const tab = tabsStore.tabs.find((t: any) => t.id === tabId);

  const currentTabList = isRightSide
    ? splitViewStore.splitView.rightTabs
    : splitViewStore.splitView.leftTabs;
  const tabIndex = currentTabList.indexOf(tabId);
  const canSplit =
    !splitViewStore.splitView.isSplit && tabsStore.tabs.length >= 2;
  const canDuplicateAndSplit =
    !splitViewStore.splitView.isSplit && tabsStore.tabs.length === 1;
  const canMoveRight =
    splitViewStore.splitView.isSplit &&
    !isRightSide &&
    splitViewStore.splitView.leftTabs.length > 1;
  const canMoveLeft =
    splitViewStore.splitView.isSplit &&
    isRightSide &&
    splitViewStore.splitView.rightTabs.length > 1;
  const canUnsplit = splitViewStore.splitView.isSplit && isRightSide;
  const canShowFromSample = !!tab && !tab.isTablet;
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  const canCloseAllExcept = currentTabList.length > 1;
  const canCompareFromClipboard = !!tab && !tab.isTablet;
  const isPinned = tab?.isPinned || false;
  const canDownload = !!tab && !tab.isTablet;
  const canRename = !!tab;
  const history = isRightSide
    ? splitViewStore.splitView.rightTabHistory
    : splitViewStore.splitView.leftTabHistory;
  const canCompareWithPrevious =
    history && history.length >= 2 && !tab?.isTablet;
  const canGroupTypes = (() => {
    if (currentTabList.length < 3) return false;
    const tabLanguages = currentTabList.map(
      (id: string) =>
        tabsStore.tabs.find((t: any) => t.id === id)?.language || "",
    );
    const uniqueLanguages = new Set(tabLanguages);
    if (uniqueLanguages.size < 2) return false;
    let currentLanguage = tabLanguages[0];
    let languageChangePoints = 0;
    for (let i = 1; i < tabLanguages.length; i++) {
      if (tabLanguages[i] !== currentLanguage) {
        languageChangePoints++;
        currentLanguage = tabLanguages[i];
      }
    }
    return languageChangePoints > uniqueLanguages.size - 1;
  })();
  const canCompare = (() => {
    if (!splitViewStore.splitView.isSplit) return false;
    const currentTab = tabsStore.tabs.find((t: any) => t.id === tabId);
    const otherSideTabId = isRightSide
      ? splitViewStore.splitView.activeLeftTabId
      : splitViewStore.splitView.activeRightTabId;
    const otherSideTab = tabsStore.tabs.find(
      (t: any) => t.id === otherSideTabId,
    );
    return (
      currentTab &&
      otherSideTab &&
      !currentTab.isTablet &&
      !otherSideTab.isTablet
    );
  })();

  // --- Confirmation Dialog Logic ---
  const handleRequestConfirmation = useCallback(
    (
      actionType:
        | "close"
        | "closeAllExcept"
        | "closeTabsToLeft"
        | "closeTabsToRight",
      message: string,
      actionTargetTabId: string,
    ) => {
      setConfirmationState({
        type: actionType,
        message,
        targetTabId: actionTargetTabId,
      });
    },
    [],
  );

  const executeConfirmedAction = useCallback(() => {
    if (!confirmationState) return;
    const { type, targetTabId } = confirmationState;

    if (type === "close") {
      rootStore.removeTab(targetTabId);
    } else if (type === "closeAllExcept") {
      rootStore.closeAllExcept(targetTabId, isRightSide);
    } else if (type === "closeTabsToLeft") {
      rootStore.closeTabsToLeft(targetTabId, isRightSide);
    } else if (type === "closeTabsToRight") {
      rootStore.closeTabsToRight(targetTabId, isRightSide);
    }

    setConfirmationState(null); // Hide dialog
    closeContextMenu(); // <<<< NOW close the context menu after the action is done
  }, [confirmationState, isRightSide, rootStore, closeContextMenu]);

  const cancelConfirmation = useCallback(() => {
    setConfirmationState(null); // Hide dialog
    closeContextMenu(); // <<<< NOW close the context menu if cancelled
  }, []);
  // --- End Confirmation Dialog Logic ---

  const handleSimpleAction = (
    actionFn: (...args: any[]) => void,
    ...args: any[]
  ) => {
    actionFn(...args);
    closeContextMenu();
  };

  const handleRename = () => {
    if (startEditingTab) {
      startEditingTab(tabId);
    }
    closeContextMenu();
  };

  const handleLanguageSelect = (languageId: string) => {
    const language = formatRegistry.getById(languageId);
    if (language?.sampleContent) {
      const currentTab = tabsStore.tabs.find((t) => t.id === tabId);
      if (currentTab && !currentTab.isTablet) {
        const sampleContent = language.sampleContent();

        // Update the tab content and language in the store first
        rootStore.updateTabContent(tabId, sampleContent);
        rootStore.updateTabLanguage(tabId, languageId, true);

        // Update the model content directly if the model exists
        // The model's listener will sync back to store, but content is already the same
        modelManager.updateModelContent(tabId, sampleContent);
      }
    }
    closeContextMenu();
  };

  const handleCompareFromClipboard = async () => {
    try {
      await rootStore.compareFromClipboard(tabId, isRightSide);
      closeContextMenu("compareClipboard", tabId);
    } catch (error) {
      console.error("[Error] Failed to compare from clipboard:", error);
      closeContextMenu();
    }
  };

  const handleCompareWithPrevious = () => {
    if (!canCompareWithPrevious || !history || history.length < 2) {
      closeContextMenu();
      return;
    }
    const previousTabId = history[1];
    if (!previousTabId) {
      closeContextMenu();
      return;
    }
    closeContextMenu("compare", tabId, isRightSide ? "right" : "left");
  };

  const handleDownload = () => {
    if (!tab || tab.isTablet) {
      closeContextMenu();
      return;
    }
    const detector = formatRegistry.getById(tab.language);
    const extension = detector?.getFileExtension() || "txt";
    const blob = new Blob([tab.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab.title}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeContextMenu();
  };

  const handleDownloadAll = () => {
    if (handleOpenDownloadAllModal) {
      handleOpenDownloadAllModal();
    }
    // Note: handleOpenDownloadAllModal might call onClose itself, or we might need to.
    // For now, assuming it handles menu closure or the modal nature does. If not, add closeContextMenu().
  };

  const generateGitHubIssueUrl = (tab: any) => {
    const title = `Tab Issue Report: ${tab.title || "Untitled"}`;

    const body = `**Problem Description**
Please describe the issue you encountered with this tab.

**Tab Details**
- **Title**: ${tab.title || "Untitled"}
- **Language**: ${tab.language || "Unknown"}
- **Type**: ${tab.isTablet ? "Tablet" : "Editor"}
- **Created**: ${tab.dateCreated ? new Date(tab.dateCreated).toISOString() : "Unknown"}
- **Last Modified**: ${tab.lastModified ? new Date(tab.lastModified).toISOString() : "Unknown"}
- **Workspace ID**: ${tab.workspaceId || "Unknown"}
- **Is Pinned**: ${tab.isPinned ? "Yes" : "No"}
- **Language Locked**: ${tab.languageLocked ? "Yes" : "No"}
- **Browser**: ${navigator.userAgent}

**Steps to Reproduce**
1. 
2. 
3. 

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Additional Context**
Add any other context about the problem here.
`;

    const params = new URLSearchParams({
      title,
      body,
      labels: "bug,tab-issue",
    });

    return `https://github.com/spectra-g/scratch-tabs-feedback/issues/new?${params.toString()}`;
  };

  const handleReportIssue = () => {
    if (tab) {
      const githubUrl = generateGitHubIssueUrl(tab);
      window.open(githubUrl, "_blank", "noopener,noreferrer");
    }
    closeContextMenu();
  };

  const handleCopyContent = async () => {
    if (tab && !tab.isTablet) {
      try {
        await navigator.clipboard.writeText(tab.content || "");
      } catch (error) {
        console.error("Failed to copy content to clipboard:", error);
      }
    }
    closeContextMenu();
  };

  const handleOpenTransformations = () => {
    if (tab && !tab.isTablet) {
      useBatchToolsStore.getState().openModal(tab.content || "");
    }
    closeContextMenu();
  };

  const menuItems: MenuItem[] = [
    {
      id: "transformations",
      label: "Transformations",
      icon: Layers,
      action: handleOpenTransformations,
      condition: !!tab && !tab.isTablet,
    },
    {
      id: "rename",
      label: "Rename",
      icon: Edit3,
      action: handleRename,
      condition: canRename,
    },
    {
      id: "copyContent",
      label: "Copy content",
      icon: Copy,
      action: handleCopyContent,
      condition: !!tab && !tab.isTablet,
    },
    {
      id: "fromSample",
      label: "From sample",
      icon: FileCode,
      condition: canShowFromSample,
      submenu: <LanguageSelector onSelect={handleLanguageSelect} />,
    },
    {
      id: "duplicate",
      label: "Duplicate tab",
      icon: Copy,
      action: () =>
        handleSimpleAction(rootStore.duplicateTab, tabId, isRightSide),
    },
    {
      id: "duplicateAndSplit",
      label: "Duplicate and split",
      icon: Split,
      action: () => handleSimpleAction(rootStore.duplicateAndSplitTab, tabId),
      condition: canDuplicateAndSplit,
    },
    {
      id: "compare",
      label: "Compare with other side",
      icon: GitCompare,
      action: () => closeContextMenu("compareSides", tabId), // Use the complex onClose
      condition: canCompare,
    },
    {
      id: "comparePrevious",
      label: "Compare with previous tab",
      icon: History,
      action: handleCompareWithPrevious,
      condition: canCompareWithPrevious,
    },
    {
      id: "compareFromClipboard",
      label: "Compare with clipboard",
      icon: ClipboardPaste,
      action: handleCompareFromClipboard,
      condition: canCompareFromClipboard,
    },
    {
      id: "groupTypes",
      label: "Group tabs by type",
      icon: Layers,
      action: () => handleSimpleAction(rootStore.groupTabsByType, isRightSide),
      condition: canGroupTypes,
    },
    {
      id: "sep1",
      isSeparator: true,
      condition: canSplit || canMoveRight || canMoveLeft || canUnsplit,
    },
    {
      id: "split",
      label: "Split",
      icon: ChevronRight,
      action: () => handleSimpleAction(rootStore.splitScreen, tabId),
      condition: canSplit,
    },
    {
      id: "moveRight",
      label: "Move right",
      icon: ChevronRight,
      action: () => handleSimpleAction(rootStore.moveTabToRight, tabId),
      condition: canMoveRight,
    },
    {
      id: "moveLeft",
      label: "Move left",
      icon: ChevronLeft,
      action: () => handleSimpleAction(rootStore.moveTabToLeft, tabId),
      condition: canMoveLeft,
    },
    {
      id: "unsplit",
      label: "Unsplit",
      icon: Maximize,
      action: () => handleSimpleAction(rootStore.unsplitScreen, tabId),
      condition: canUnsplit,
    },
    { id: "sep2", isSeparator: true, condition: canDownload },
    {
      id: "download",
      label: "Download",
      icon: Download,
      action: handleDownload,
      condition: canDownload,
    },
    {
      id: "downloadAll",
      label: "Download all tabs",
      icon: Download,
      action: handleDownloadAll,
      condition: canDownload,
    },
    {
      id: "sep3",
      isSeparator: true,
      condition: canCloseToLeft || canCloseToRight || canCloseAllExcept,
    },
    {
      id: "closeToLeft",
      label: "Close tabs to the left",
      icon: ChevronLeftSquare,
      action: () =>
        handleRequestConfirmation(
          "closeTabsToLeft",
          "This will close all tabs to the left of the current tab. This action cannot be undone.",
          tabId,
        ),
      condition: canCloseToLeft,
    },
    {
      id: "closeToRight",
      label: "Close tabs to the right",
      icon: ChevronRightSquare,
      action: () =>
        handleRequestConfirmation(
          "closeTabsToRight",
          "This will close all tabs to the right of the current tab. This action cannot be undone.",
          tabId,
        ),
      condition: canCloseToRight,
    },
    {
      id: "closeAllExcept",
      label: "Close all other tabs",
      icon: XCircle,
      action: () =>
        handleRequestConfirmation(
          "closeAllExcept",
          "This will close all tabs except the current one. This action cannot be undone.",
          tabId,
        ),
      condition: canCloseAllExcept,
    },
    { id: "sep4", isSeparator: true },
    {
      id: "pin",
      label: isPinned ? "Unpin Tab" : "Pin Tab",
      icon: Pin,
      action: () => handleSimpleAction(rootStore.toggleTabPin, tabId),
    },
    {
      id: "close",
      label: "Close",
      icon: XCircle,
      action: () => {
        // Wrapped in an arrow function to add a log
        handleRequestConfirmation(
          "close",
          `Close tab "${tab?.title || "current"}"? This action cannot be undone.`,
          tabId,
        );
      },
    },
    {
      id: "reportIssue",
      label: "Report issue",
      icon: ExternalLink,
      action: handleReportIssue,
    },
  ];

  const visibleItems: MenuItem[] = [];
  menuItems.forEach((item, index) => {
    if (item.condition === false) return;
    if (item.isSeparator) {
      const nextVisibleItemIndex = menuItems.findIndex(
        (nextItem, nextIndex) =>
          nextIndex > index &&
          nextItem.condition !== false &&
          !nextItem.isSeparator,
      );
      const prevVisible = visibleItems[visibleItems.length - 1];
      if (
        prevVisible &&
        !prevVisible.isSeparator &&
        nextVisibleItemIndex !== -1
      ) {
        visibleItems.push(item);
      }
    } else {
      visibleItems.push(item);
    }
  });
  if (
    visibleItems.length > 0 &&
    visibleItems[visibleItems.length - 1].isSeparator
  ) {
    visibleItems.pop();
  }

  return {
    menuItems: visibleItems,
    confirmationDialogProps: confirmationState
      ? {
          isOpen: true,
          message: confirmationState.message,
          confirmButtonText: getConfirmButtonText(confirmationState.type),
          onConfirm: executeConfirmedAction,
          onCancel: cancelConfirmation,
        }
      : null,
  };
};
