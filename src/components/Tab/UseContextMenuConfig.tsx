import { useRootStore } from "../../stores";
import { useAIStore } from "../../stores/aiStore";
import {
  Brain,
  ChevronLeft, ChevronLeftSquare, ChevronRight, ChevronRightSquare, Copy, Edit3, FileCode, GitCompare,
  Layers, Maximize, Split, XCircle, ClipboardPaste, Pin, Download, History
} from 'lucide-react';
import { LanguageSelector } from "./LanguageSelector";
import { languageRegistry } from '../../languages';
import { MenuItem } from './types';
import { useState, useCallback } from 'react';

// Helper function to get the confirmation button text based on action type
const getConfirmButtonText = (type: string | null): string => {
  if (type === 'close') return 'Close Tab';
  if (type === 'closeAllExcept') return 'Close Others';
  if (type === 'closeTabsToLeft') return 'Close Left Tabs';
  if (type === 'closeTabsToRight') return 'Close Right Tabs';
  return 'Confirm';
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
  closeContextMenu: (action?: 'compare' | 'compareSides' | 'summary' | 'compareClipboard', tabId?: string, explicitSide?: 'left' | 'right') => void,
  handleOpenDownloadAllModal?: () => void,
  startEditingTab?: (tabId: string) => void
): UseContextMenuConfigReturn => {
  const store = useRootStore();
  const { isReady: isAiReady, isLoading: isAiLoading } = useAIStore(state => state.ai);

  const [confirmationState, setConfirmationState] = useState<{
    type: 'close' | 'closeAllExcept' | 'closeTabsToLeft' | 'closeTabsToRight';
    message: string;
    targetTabId: string;
  } | null>(null);

  const tab = store.tabs.find(t => t.id === tabId);

  const currentTabList = isRightSide ? store.splitView.rightTabs : store.splitView.leftTabs;
  const tabIndex = currentTabList.indexOf(tabId);
  const canSplit = !store.splitView.isSplit && store.tabs.length >= 2;
  const canDuplicateAndSplit = !store.splitView.isSplit && store.tabs.length === 1;
  const canMoveRight = store.splitView.isSplit && !isRightSide && store.splitView.leftTabs.length > 1;
  const canMoveLeft = store.splitView.isSplit && isRightSide && store.splitView.rightTabs.length > 1;
  const canUnsplit = store.splitView.isSplit && isRightSide;
  const canShowFromSample = !!tab && !tab.isTablet;
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  const canCloseAllExcept = currentTabList.length > 1;
  const canCompareFromClipboard = !!tab && !tab.isTablet;
  const isPinned = tab?.isPinned || false;
  const canDownload = !!tab && !tab.isTablet;
  const canRename = !!tab;
  const canSummarize = isAiReady && !isAiLoading && !!tab && !tab.isTablet && tab.content.trim().length > 0;
  const history = isRightSide ? store.splitView.rightTabHistory : store.splitView.leftTabHistory;
  const canCompareWithPrevious = history && history.length >= 2 && !tab?.isTablet;
  const canGroupTypes = (() => {
    if (currentTabList.length < 3) return false;
    const tabLanguages = currentTabList.map(id => store.tabs.find(t => t.id === id)?.language || '');
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
    if (!store.splitView.isSplit) return false;
    const currentTab = store.tabs.find(t => t.id === tabId);
    const otherSideTabId = isRightSide ? store.splitView.activeLeftTabId : store.splitView.activeRightTabId;
    const otherSideTab = store.tabs.find(t => t.id === otherSideTabId);
    return currentTab && otherSideTab && !currentTab.isTablet && !otherSideTab.isTablet;
  })();

  // --- Confirmation Dialog Logic ---
  const handleRequestConfirmation = useCallback((
    actionType: 'close' | 'closeAllExcept' | 'closeTabsToLeft' | 'closeTabsToRight',
    message: string,
    actionTargetTabId: string
  ) => {
    setConfirmationState({ type: actionType, message, targetTabId: actionTargetTabId });
  }, []);

  const executeConfirmedAction = useCallback(() => {
    if (!confirmationState) return;
    const { type, targetTabId } = confirmationState;

    if (type === 'close') {
      store.removeTab(targetTabId);
    } else if (type === 'closeAllExcept') {
      store.closeAllExcept(targetTabId, isRightSide);
    } else if (type === 'closeTabsToLeft') {
      store.closeTabsToLeft(targetTabId, isRightSide);
    } else if (type === 'closeTabsToRight') {
      store.closeTabsToRight(targetTabId, isRightSide);
    }

    setConfirmationState(null); // Hide dialog
    closeContextMenu(); // <<<< NOW close the context menu after the action is done

  }, [confirmationState, store, isRightSide]);

  const cancelConfirmation = useCallback(() => {
    setConfirmationState(null); // Hide dialog
    closeContextMenu(); // <<<< NOW close the context menu if cancelled

  }, []);
  // --- End Confirmation Dialog Logic ---

  const handleSimpleAction = (actionFn: (...args: any[]) => void, ...args: any[]) => {
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
    const language = languageRegistry.getById(languageId);
    if (language?.sampleContent) {
      const currentTab = store.tabs.find(t => t.id === tabId);
      if (currentTab && !currentTab.isTablet) {
        store.updateTabContent(tabId, language.sampleContent());
        store.updateTabLanguage(tabId, languageId, true);
      }
    }
    closeContextMenu();
  };

  const handleSummarize = async () => {
    closeContextMenu('summary', tabId);
  };

  const handleCompareFromClipboard = async () => {
    try {
      await store.compareFromClipboard(tabId, isRightSide);
      closeContextMenu('compareClipboard', tabId);
    } catch (error) {
      console.error('[Error] Failed to compare from clipboard:', error);
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
    closeContextMenu('compare', tabId, isRightSide ? 'right' : 'left');
  };

  const handleDownload = () => {
    if (!tab || tab.isTablet) {
      closeContextMenu();
      return;
    }
    const detector = languageRegistry.getById(tab.language);
    const extension = detector?.getFileExtension() || 'txt';
    const blob = new Blob([tab.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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

  const getSummarizeLabel = () => {
    if (isAiLoading) return "Initializing AI...";
    if (!isAiReady) return "AI Not Ready";
    return "Summarize";
  }

  const menuItems: MenuItem[] = [
    {
      id: 'summarize',
      label: getSummarizeLabel(),
      icon: Brain,
      action: handleSummarize,
      condition: canSummarize
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: Edit3,
      action: handleRename,
      condition: canRename,
    },
    {
      id: 'fromSample',
      label: 'From sample',
      icon: FileCode,
      condition: canShowFromSample,
      submenu: <LanguageSelector onSelect={handleLanguageSelect} />,
    },
    {
      id: 'duplicate',
      label: 'Duplicate tab',
      icon: Copy,
      action: () => handleSimpleAction(store.duplicateTab, tabId, isRightSide),
    },
    {
      id: 'duplicateAndSplit',
      label: 'Duplicate and split',
      icon: Split,
      action: () => handleSimpleAction(store.duplicateAndSplitTab, tabId),
      condition: canDuplicateAndSplit
    },
    {
      id: 'compare',
      label: 'Compare with other side',
      icon: GitCompare,
      action: () => closeContextMenu('compareSides', tabId), // Use the complex onClose
      condition: canCompare
    },
    {
      id: 'comparePrevious',
      label: 'Compare with previous tab',
      icon: History,
      action: handleCompareWithPrevious,
      condition: canCompareWithPrevious
    },
    {
      id: 'compareFromClipboard',
      label: 'Compare from clipboard',
      icon: ClipboardPaste,
      action: handleCompareFromClipboard,
      condition: canCompareFromClipboard
    },
    {
      id: 'groupTypes',
      label: 'Group tabs by type',
      icon: Layers,
      action: () => handleSimpleAction(store.groupTabsByType, isRightSide),
      condition: canGroupTypes
    },
    { id: 'sep1', isSeparator: true, condition: canSplit || canMoveRight || canMoveLeft || canUnsplit },
    {
      id: 'split',
      label: 'Split',
      icon: ChevronRight,
      action: () => handleSimpleAction(store.splitScreen, tabId),
      condition: canSplit,
    },
    {
      id: 'moveRight',
      label: 'Move right',
      icon: ChevronRight,
      action: () => handleSimpleAction(store.moveTabToRight, tabId),
      condition: canMoveRight,
    },
    {
      id: 'moveLeft',
      label: 'Move left',
      icon: ChevronLeft,
      action: () => handleSimpleAction(store.moveTabToLeft, tabId),
      condition: canMoveLeft,
    },
    {
      id: 'unsplit',
      label: 'Unsplit',
      icon: Maximize,
      action: () => handleSimpleAction(store.unsplitScreen),
      condition: canUnsplit,
    },
    { id: 'sep2', isSeparator: true, condition: canDownload },
    {
      id: 'download',
      label: 'Download',
      icon: Download,
      action: handleDownload,
      condition: canDownload,
    },
    {
      id: 'downloadAll',
      label: 'Download All...',
      icon: Download,
      action: handleDownloadAll, // Assuming this handles menu close or modal takes over
      condition: canDownload, // Or a more specific condition if needed
    },
    { id: 'sep3', isSeparator: true, condition: canCloseToLeft || canCloseToRight || canCloseAllExcept || true /* for Close and Pin */ },
    {
      id: 'pin',
      label: isPinned ? 'Unpin Tab' : 'Pin Tab',
      icon: Pin,
      action: () => handleSimpleAction(store.toggleTabPin, tabId),
    },
    {
      id: 'close',
      label: 'Close',
      icon: XCircle,
      action: () => { // Wrapped in an arrow function to add a log
        handleRequestConfirmation(
          'close',
          `Close tab "${tab?.title || 'current'}"? This action cannot be undone.`,
          tabId
        );
      },

    },
    {
      id: 'closeAllExcept',
      label: 'Close all except this',
      icon: XCircle,
      action: () => handleRequestConfirmation(
        'closeAllExcept',
        `Close all tabs except "${tab?.title || 'current'}"? This action cannot be undone.`,
        tabId
      ),
      condition: canCloseAllExcept,
    },
    {
      id: 'closeAllLeft',
      label: 'Close tabs to the left',
      icon: ChevronLeftSquare,
      action: () => handleRequestConfirmation(
        'closeTabsToLeft',
        'Close all tabs to the left? This action cannot be undone.',
        tabId
      ),
      condition: canCloseToLeft,
    },
    {
      id: 'closeAllRight',
      label: 'Close tabs to the right',
      icon: ChevronRightSquare,
      action: () => handleRequestConfirmation(
        'closeTabsToRight',
        'Close all tabs to the right? This action cannot be undone.',
        tabId
      ),
      condition: canCloseToRight,
    },
  ];

  const visibleItems: MenuItem[] = [];
  menuItems.forEach((item, index) => {
    if (item.condition === false) return;
    if (item.isSeparator) {
      const nextVisibleItemIndex = menuItems.findIndex((nextItem, nextIndex) =>
        nextIndex > index && nextItem.condition !== false && !nextItem.isSeparator
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
  };
};