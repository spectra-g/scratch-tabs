import { useRootStore } from "../../stores";
import {
  ChevronLeft, ChevronLeftSquare, ChevronRight, ChevronRightSquare, Copy, FileCode, GitCompare,
  Layers, Maximize, Split, XCircle, ClipboardPaste, Pin, Download, History
} from 'lucide-react';
import { LanguageSelector } from "./LanguageSelector";
import { languageRegistry } from '../../languages';
import { MenuItem } from './types';

export const useContextMenuConfig = (
    tabId: string,
    isRightSide: boolean,
    onClose: (action?: 'compare') => void,
    handleOpenModal: () => void
): MenuItem[] => {
  const store = useRootStore();
  const tab = store.tabs.find(t => t.id === tabId);

  // Calculate conditions
  const currentTabList = isRightSide ? store.splitView.rightTabs : store.splitView.leftTabs;
  const tabIndex = currentTabList.indexOf(tabId);
  const canSplit = !store.splitView.isSplit && store.tabs.length >= 2;
  const canDuplicateAndSplit = !store.splitView.isSplit && store.tabs.length === 1;
  const canMoveRight = store.splitView.isSplit && !isRightSide && store.splitView.leftTabs.length > 1;
  const canMoveLeft = store.splitView.isSplit && isRightSide && store.splitView.rightTabs.length > 1;
  const canUnsplit = store.splitView.isSplit &&
    ((isRightSide && store.splitView.rightTabs.length === 1) ||
      (!isRightSide && store.splitView.leftTabs.length === 1));
  const canShowFromSample = !!tab && !tab.isTablet;
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  const canCloseAllExcept = currentTabList.length > 1;
  const canCompareFromClipboard = !!tab && !tab.isTablet;
  const isPinned = tab?.isPinned || false;
  const canDownload = !!tab && !tab.isTablet;

  // Get the history for the current side
  const history = isRightSide ? store.splitView.rightTabHistory : store.splitView.leftTabHistory;
  // Check if we have at least 2 items in history (current and previous)
  const canCompareWithPrevious = history && history.length >= 2 && !tab?.isTablet;

  const canGroupTypes = (() => {
    if (currentTabList.length < 3) return false;
    const tabLanguages = currentTabList.map(id => {
      const tab = store.tabs.find(t => t.id === id);
      return tab ? tab.language : '';
    });
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

  const handleSimpleAction = (actionFn: (...args: any[]) => void, ...args: any[]) => {
    actionFn(...args);
    onClose();
  };

  const handleLanguageSelect = (languageId: string) => {
    const language = languageRegistry.getById(languageId);
    if (language?.sampleContent) {
      const tab = store.tabs.find(t => t.id === tabId);
      if (tab && !tab.isTablet) {
        store.updateTabContent(tabId, language.sampleContent());
        store.updateTabLanguage(tabId, languageId, true);
      }
    }
    onClose();
  };

  const handleCompareFromClipboard = async () => {
    await store.compareFromClipboard(tabId, isRightSide);
    onClose('compare');
  };

  const handleCompareWithPrevious = () => {
    if (!canCompareWithPrevious || !history || history.length < 2) return;

    // Get the previous tab ID from history (index 1 since current tab is at index 0)
    const previousTabId = history[1];
    if (!previousTabId) return;

    // Open diff modal with current and previous tabs
    onClose('compare');
  };

  const handleDownload = () => {
    if (!tab || tab.isTablet) return;

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
    onClose();
  };

  const handleDownloadAll = () => {
    handleOpenModal();
  };

  const menuItems: MenuItem[] = [
    {
      id: 'fromSample',
      label: 'From sample',
      icon: FileCode,
      condition: canShowFromSample,
      submenu: <LanguageSelector onSelect={handleLanguageSelect}/>,
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
      action: () => onClose('compare'),
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
    {id: 'sep1', isSeparator: true, condition: canSplit || canMoveRight || canMoveLeft || canUnsplit},
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
      action: () => handleSimpleAction(store.unsplitScreen, isRightSide),
      condition: canUnsplit,
    },
    {id: 'sep2', isSeparator: true, condition: canDownload},
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
      action: handleDownloadAll,
      condition: canDownload,
    },
    {id: 'sep3', isSeparator: true, condition: canCloseToLeft || canCloseToRight || canCloseAllExcept},
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
      action: () => handleSimpleAction(store.removeTab, tabId),
    },
    {
      id: 'closeAllExcept',
      label: 'Close all except this',
      icon: XCircle,
      action: () => handleSimpleAction(store.closeAllExcept, tabId, isRightSide),
      condition: canCloseAllExcept,
    },
    {
      id: 'closeAllLeft',
      label: 'Close tabs to the left',
      icon: ChevronLeftSquare,
      action: () => handleSimpleAction(store.closeTabsToLeft, tabId, isRightSide),
      condition: canCloseToLeft,
    },
    {
      id: 'closeAllRight',
      label: 'Close tabs to the right',
      icon: ChevronRightSquare,
      action: () => handleSimpleAction(store.closeTabsToRight, tabId, isRightSide),
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

  return visibleItems;
};