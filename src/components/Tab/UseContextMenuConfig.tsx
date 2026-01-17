import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useRootStore } from "../../stores/rootStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useMacroStore } from "../../stores/macroStore";
import { useBatchToolsStore } from "../../stores/batchToolsStore";
import { usePipelineStore } from "../../stores/pipelineStore";
import {
  Copy,
  GitCompare,
  XCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  MagicWand,
  Layers,
  Maximize,
  Split,
  Scissors,
  Circle,
  Grid,
  History,
  ClipboardPaste,
  Share2,
  FileCode,
  PanelLeftClose,
  PanelRightClose,
  Download,
  Play,
} from "../Icons";
import { FormatSelector } from "./FormatSelector";
import { formatRegistry } from "../../formats";
import { downloadTab } from "../../utils/downloadTab";
import { MenuItem } from "./types";
import { useState, useCallback } from "react";
import { ContextMenuAction, TabSide } from "../../constants";
import { modelManager } from "../../services/modelManager";
import { toolService, ToolItem } from "../../services/toolService";
import {
  SubMenuItem,
  OrganizeSubmenu,
  CloseSubmenu,
} from "./ContextMenuSubmenus";
import { OpenInSubmenu } from "./OpenInSubmenu";

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
  splitModalProps: {
    isOpen: boolean;
    tabId: string;
    onClose: () => void;
  } | null;
  shareModalProps: {
    isOpen: boolean;
    tabId: string;
    onClose: () => void;
  } | null;
  tabletModalOpen: boolean;
  onOpenTabletModal: () => void;
  onSelectTool: (item: ToolItem) => Promise<void>;
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
  const { activeWorkspaceId } = useWorkspaceStore();
  const { setForceShowToolbar } = useMacroStore();

  const [confirmationState, setConfirmationState] = useState<{
    type: "close" | "closeAllExcept" | "closeTabsToLeft" | "closeTabsToRight";
    message: string;
    targetTabId: string;
  } | null>(null);

  const [splitModalState, setSplitModalState] = useState<{ tabId: string } | null>(null);
  const [shareModalState, setShareModalState] = useState<{ tabId: string } | null>(null);
  const [tabletModalOpen, setTabletModalOpen] = useState(false);
  const { openModal: openBatchToolsModal } = useBatchToolsStore();
  const { openModal: openPipelineModal } = usePipelineStore();

  const tab = tabsStore.tabs.find((t: any) => t.id === tabId);

  const currentTabList = isRightSide
    ? splitViewStore.splitView.rightTabs
    : splitViewStore.splitView.leftTabs;
  const tabIndex = currentTabList.indexOf(tabId);

  // Capability checks
  const canSplit = !splitViewStore.splitView.isSplit && tabsStore.tabs.length >= 2;
  const canMoveRight = splitViewStore.splitView.isSplit && !isRightSide && splitViewStore.splitView.leftTabs.length > 1;
  const canMoveLeft = splitViewStore.splitView.isSplit && isRightSide && splitViewStore.splitView.rightTabs.length > 1;
  const canUnsplit = splitViewStore.splitView.isSplit && isRightSide;
  const canShowFromSample = !!tab && !tab.isTablet && !tab.isRich;
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  const canCloseAllExcept = currentTabList.length > 1;
  const canCompareFromClipboard = !!tab && !tab.isTablet && !tab.isRich;
  const isPinned = tab?.isPinned || false;
  const canDownload = !!tab && !tab.isTablet;
  const canRename = !!tab;


  const history = isRightSide
    ? splitViewStore.splitView.rightTabHistory
    : splitViewStore.splitView.leftTabHistory;
  const canCompareWithPrevious = history && history.length >= 2 && !tab?.isTablet && !tab?.isRich;



  const canCompare = (() => {
    if (!splitViewStore.splitView.isSplit) return false;
    const currentTab = tabsStore.tabs.find((t: any) => t.id === tabId);
    const otherSideTabId = isRightSide
      ? splitViewStore.splitView.activeLeftTabId
      : splitViewStore.splitView.activeRightTabId;
    const otherSideTab = tabsStore.tabs.find((t: any) => t.id === otherSideTabId);
    return (
      currentTab &&
      otherSideTab &&
      !currentTab.isTablet &&
      !otherSideTab.isTablet &&
      !currentTab.isRich &&
      !otherSideTab.isRich
    );
  })();

  // Action handlers
  const handleSimpleAction = (actionFn: (...args: any[]) => void, ...args: any[]) => {
    actionFn(...args);
    closeContextMenu();
  };

  const handleOpenTransformations = () => {
    if (tab) {
      openBatchToolsModal(tab.content || "", "");
      closeContextMenu();
    }
  };

  const handleOpenPipeline = () => {
    if (tab) {
      openPipelineModal(tab.content || "");
      closeContextMenu();
    }
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
        // Update language and content in store first (works for both active and inactive tabs)
        rootStore.updateTabLanguage(tabId, languageId, true);
        rootStore.updateTabContent(tabId, sampleContent);
        // Also update the model if it exists (for active tabs only)
        modelManager.replaceModelContentWithUndo(tabId, sampleContent);
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
    if (tab) {
      downloadTab(tab);
    }
    closeContextMenu();
  };

  const handleDownloadAll = () => {
    if (handleOpenDownloadAllModal) {
      handleOpenDownloadAllModal();
    }
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

  const handleMacroRecording = () => {
    // Activate the tab first so the floating toolbar is visible
    rootStore.setActiveTab(tabId);
    // Show the floating macro toolbar for THIS tab specifically
    setForceShowToolbar(true, tabId, isRightSide ? 'right' : 'left');
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



  const handleOpenSplitModal = () => {
    setSplitModalState({ tabId });
  };

  const handleCloseSplitModal = () => {
    setSplitModalState(null);
    closeContextMenu();
  };

  const handleOpenShareModal = () => {
    setShareModalState({ tabId });
  };

  const handleCloseShareModal = () => {
    setShareModalState(null);
    closeContextMenu();
  };

  const handleOpenTabletModal = () => {
    setTabletModalOpen(true);
    // Note: We don't close context menu here - it will be closed when tool is selected
  };

  const handleSelectTool = async (item: ToolItem) => {
    await toolService.executeTool(item, {
      side: isRightSide ? 'right' : 'left',
      activeWorkspaceId: activeWorkspaceId || 'default',
      addTab: (tabData, isRight) => rootStore.addTab(tabData, isRight),
    });
    setTabletModalOpen(false);
    closeContextMenu();
  };

  const handleRequestConfirmation = useCallback(
    (
      actionType: "close" | "closeAllExcept" | "closeTabsToLeft" | "closeTabsToRight",
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

    setConfirmationState(null);
    closeContextMenu();
  }, [confirmationState, isRightSide, rootStore, closeContextMenu]);

  const cancelConfirmation = useCallback(() => {
    setConfirmationState(null);
    closeContextMenu();
  }, [closeContextMenu]);

  // Tidy up the menu structure - FINAL RESTRUCTURE
  const menuItems: MenuItem[] = [
    // 1. Share
    {
      id: "share",
      label: "Share",
      icon: Share2,
      action: handleOpenShareModal,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // Duplicate
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Copy,
      action: () => handleSimpleAction(rootStore.duplicateTab, tabId, isRightSide),
      condition: !!tab && !tab.isTablet,
    },
    // Compare with other side
    {
      id: "compare",
      label: "Compare with other side",
      icon: GitCompare,
      action: () => closeContextMenu("compareSides", tabId),
      condition: canCompare,
    },
    // 2. Compare with Previous Tab
    {
      id: "compareWithPrevious",
      label: "Compare with Previous Tab",
      icon: History,
      action: handleCompareWithPrevious,
      condition: !!canCompareWithPrevious,
    },
    // 3. Compare with Clipboard
    {
      id: "compareClipboard",
      label: "Compare with Clipboard",
      icon: ClipboardPaste,
      action: handleCompareFromClipboard,
      condition: !!canCompareFromClipboard,
    },
    // 4. Split Right / Unsplit
    {
      id: "split-unsplit",
      label: canUnsplit ? "Unsplit" : "Split Right",
      icon: canUnsplit ? Maximize : Split,
      action: () => handleSimpleAction(canUnsplit ? rootStore.unsplitScreen : rootStore.splitScreen, tabId),
      condition: canUnsplit || canSplit,
    },
    // Move Right
    {
      id: "moveRight",
      label: "Move to Right",
      icon: ChevronRight,
      action: () => handleSimpleAction(rootStore.moveTabToRight, tabId),
      condition: canMoveRight,
    },
    // Move Left
    {
      id: "moveLeft",
      label: "Move to Left",
      icon: ChevronLeft,
      action: () => handleSimpleAction(rootStore.moveTabToLeft, tabId),
      condition: canMoveLeft,
    },
    // Separator
    { id: "sep-1", isSeparator: true },
    // 5. From Sample
    {
      id: "fromSample",
      label: "From Sample",
      icon: FileCode,
      condition: canShowFromSample,
      submenu: <FormatSelector onSelect={handleLanguageSelect} />,
    },
    // 6. Open In...
    {
      id: "openIn",
      label: "Open in...",
      icon: Grid,
      condition: !!tab && !tab.isTablet && !tab.isRich,
      submenu: (
        <OpenInSubmenu
          tab={tab!}
          isRightSide={isRightSide}
          onClose={closeContextMenu}
          onOpenTabletModal={handleOpenTabletModal}
        />
      ),
    },
    // Separator
    { id: "sep-2", isSeparator: true },
    // 7. Transformations
    {
      id: "transformations",
      label: "Transformations",
      icon: MagicWand,
      action: handleOpenTransformations,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // Pipeline
    {
      id: "pipeline",
      label: "Pipeline",
      icon: Play,
      action: handleOpenPipeline,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // Macro Recording
    {
      id: "macroRecording",
      label: "Macro Recording",
      icon: Circle,
      action: handleMacroRecording,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // 8. Split Content
    {
      id: "splitTab",
      label: "Split Content",
      icon: Scissors,
      action: handleOpenSplitModal,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // 9. Copy Content
    {
      id: "copyContent",
      label: "Copy Content",
      icon: Copy,
      action: handleCopyContent,
      condition: !!tab && !tab.isTablet && !tab.isRich,
    },
    // Separator
    { id: "sep-3", isSeparator: true },
    // 10. Organize
    {
      id: "organize",
      label: "Organize",
      icon: Layers,
      submenu: (
        <OrganizeSubmenu
          isPinned={isPinned}
          canGroupTypes={true}
          canRename={canRename}
          onTogglePin={() => handleSimpleAction(rootStore.toggleTabPin, tabId)}
          onGroupTypes={() => handleSimpleAction(rootStore.groupTabsByType, isRightSide)}
          onRename={handleRename}
        />
      ),
    },
    // 11. Download
    {
      id: "download",
      label: "Download",
      icon: Download,
      condition: canDownload,
      submenu: (
        <div className="py-1">
          <SubMenuItem label="Download Tab" icon={Download} onClick={handleDownload} />
          <SubMenuItem label="Download All" icon={Download} onClick={handleDownloadAll} />
        </div>
      ),
    },
    // Separator
    { id: "sep-4", isSeparator: true },
    // 12. Close
    {
      id: "close",
      label: "Close",
      icon: XCircle,
      submenu: (
        <CloseSubmenu
          canCloseToLeft={canCloseToLeft}
          canCloseToRight={canCloseToRight}
          canCloseAllExcept={canCloseAllExcept}
          leftIcon={PanelLeftClose}
          rightIcon={PanelRightClose}
          onClose={() =>
            handleRequestConfirmation(
              "close",
              `Close tab "${tab?.title || "current"}"? This action cannot be undone.`,
              tabId,
            )
          }
          onCloseAllExcept={() =>
            handleRequestConfirmation(
              "closeAllExcept",
              "This will close all tabs except the current one. This action cannot be undone.",
              tabId,
            )
          }
          onCloseToLeft={() =>
            handleRequestConfirmation(
              "closeTabsToLeft",
              "This will close all tabs to the left of the current tab. This action cannot be undone.",
              tabId,
            )
          }
          onCloseToRight={() =>
            handleRequestConfirmation(
              "closeTabsToRight",
              "This will close all tabs to the right of the current tab. This action cannot be undone.",
              tabId,
            )
          }
        />
      ),
    },
    // 13. Report Issue
    {
      id: "reportIssue",
      label: "Report Issue",
      icon: ExternalLink,
      action: handleReportIssue,
    },
  ];

  // Filter visible items (same logic as before)
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
      if (prevVisible && !prevVisible.isSeparator && nextVisibleItemIndex !== -1) {
        visibleItems.push(item);
      }
    } else {
      visibleItems.push(item);
    }
  });

  if (visibleItems.length > 0 && visibleItems[visibleItems.length - 1].isSeparator) {
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
    splitModalProps: splitModalState
      ? {
        isOpen: true,
        tabId: splitModalState.tabId,
        onClose: handleCloseSplitModal,
      }
      : null,
    shareModalProps: shareModalState
      ? {
        isOpen: true,
        tabId: shareModalState.tabId,
        onClose: handleCloseShareModal,
      }
      : null,
    tabletModalOpen,
    onOpenTabletModal: handleOpenTabletModal,
    onSelectTool: handleSelectTool,
  };
};
