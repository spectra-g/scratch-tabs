import { useRootStore } from "../../stores";
import {
  ChevronLeft, ChevronLeftSquare, ChevronRight, ChevronRightSquare, Copy, FileCode, GitCompare,
  Layers, Maximize, Split, XCircle, ClipboardPaste
} from "lucide-react";
import { LanguageSelector } from "./LanguageSelector"; // Assuming path is correct
import { languageRegistry } from "../../languages";
import { MenuItem } from './types'; // Assuming you put the type in a separate file or define above

// Hook or function to generate menu configuration
export const useContextMenuConfig = (tabId: string, isRightSide: boolean, onClose: (action?: 'compare') => void): MenuItem[] => {
  const store = useRootStore();

  // --- Calculate conditions (Keep this logic, consider moving to store selectors eventually) ---
  const currentTabList = isRightSide ? store.splitView.rightTabs : store.splitView.leftTabs;
  const tabIndex = currentTabList.indexOf(tabId);
  const canSplit = !store.splitView.isSplit && store.tabs.length >= 2;
  const canDuplicateAndSplit = !store.splitView.isSplit && store.tabs.length === 1;
  const canMoveRight = store.splitView.isSplit && !isRightSide && store.splitView.leftTabs.length > 1;
  const canMoveLeft = store.splitView.isSplit && isRightSide && store.splitView.rightTabs.length > 1;
  const canUnsplit = store.splitView.isSplit &&
    ((isRightSide && store.splitView.rightTabs.length === 1) ||
      (!isRightSide && store.splitView.leftTabs.length === 1));
  const currentTab = store.tabs.find(t => t.id === tabId);
  const canShowFromSample = !!currentTab && !currentTab.isTablet;
  const canCloseToLeft = tabIndex > 0;
  const canCloseToRight = tabIndex < currentTabList.length - 1;
  const canCloseAllExcept = currentTabList.length > 1;
  const canCompareFromClipboard = !!currentTab && !currentTab.isTablet;
  const canGroupTypes = (() => {
    // Need at least 3 tabs to make grouping meaningful
    if (currentTabList.length < 3) return false;

    // Get the languages of all tabs in the current list
    const tabLanguages = currentTabList.map(id => {
      const tab = store.tabs.find(t => t.id === id);
      return tab ? tab.language : '';
    });

    // Check if there are at least two different languages
    const uniqueLanguages = new Set(tabLanguages);
    if (uniqueLanguages.size < 2) return false;

    // Check if the tabs are already grouped by type
    let currentLanguage = tabLanguages[0];
    let languageChangePoints = 0;

    for (let i = 1; i < tabLanguages.length; i++) {
      if (tabLanguages[i] !== currentLanguage) {
        languageChangePoints++;
        currentLanguage = tabLanguages[i];
      }
    }

    // If we have more language changes than unique languages, they're not grouped
    return languageChangePoints > uniqueLanguages.size - 1;
  })();

  // Determine if we can compare with the other side
  const canCompare = (() => {
    if (!store.splitView.isSplit) return false;

    // Get the current tab and the active tab from the other side
    const currentTab = store.tabs.find(t => t.id === tabId);
    const otherSideTabId = isRightSide ? store.splitView.activeLeftTabId : store.splitView.activeRightTabId;
    const otherSideTab = store.tabs.find(t => t.id === otherSideTabId);

    // Can only compare if both tabs exist and neither is a tablet
    return currentTab && otherSideTab && !currentTab.isTablet && !otherSideTab.isTablet;
  })();
  // --- End Conditions ---


  // Helper to wrap actions with closing the menu
  const handleSimpleAction = (actionFn: (...args: any[]) => void, ...args: any[]) => {
    actionFn(...args);
    onClose();
  };

  // Handler for language selection (passed down to LanguageSelector)
  const handleLanguageSelect = (languageId: string) => {
    const language = languageRegistry.getById(languageId);
    if (language?.sampleContent) {
      const tab = store.tabs.find(t => t.id === tabId);
      if (tab && !tab.isTablet) {
        store.updateTabContent(tabId, language.sampleContent());
        store.updateTabLanguage(tabId, languageId, true);
      }
    }
    onClose(); // Close the main menu after selection
  };

  const handleCompareFromClipboard = async () => {
    // Call the store action to handle state changes
    await store.compareFromClipboard(tabId, isRightSide);
    // Close the menu and signal to open the diff modal
    onClose('compare');
  };

  const menuItems: MenuItem[] = [
    {
      id: 'fromSample', label: 'From sample', icon: FileCode,
      condition: canShowFromSample,
      // Provide the submenu component with its necessary props
      submenu: <LanguageSelector onSelect={handleLanguageSelect}/>,
      // No primary action needed here if submenu handles the interaction
    },
    {
      id: 'duplicate', label: 'Duplicate tab', icon: Copy,
      action: () => handleSimpleAction(store.duplicateTab, tabId, isRightSide),
    },
    {
      id: 'duplicateAndSplit', label: 'Duplicate and split', icon: Split,
      action: () => handleSimpleAction(store.duplicateAndSplitTab, tabId),
      condition: canDuplicateAndSplit
    },
    {
      id: 'compare', label: 'Compare with other side', icon: GitCompare,
      // Special onClose action needed for compare
      action: () => onClose('compare'),
      condition: canCompare
    },
    {
      id: 'compareFromClipboard', label: 'Compare from clipboard', icon: ClipboardPaste, // Use a suitable icon
      action: handleCompareFromClipboard, // Use the new async handler
      condition: canCompareFromClipboard // Only show if the current tab is not a tablet
    },
    {
      id: 'groupTypes', label: 'Group tabs by type', icon: Layers,
      action: () => handleSimpleAction(store.groupTabsByType, isRightSide),
      condition: canGroupTypes
    },
    {id: 'sep1', isSeparator: true, condition: canSplit || canMoveRight || canMoveLeft || canUnsplit},
    {
      id: 'split', label: 'Split', icon: ChevronRight,
      action: () => handleSimpleAction(store.splitScreen, tabId),
      condition: canSplit,
    },
    {
      id: 'moveRight', label: 'Move right', icon: ChevronRight,
      action: () => handleSimpleAction(store.moveTabToRight, tabId),
      condition: canMoveRight,
    },
    {
      id: 'moveLeft', label: 'Move left', icon: ChevronLeft,
      action: () => handleSimpleAction(store.moveTabToLeft, tabId),
      condition: canMoveLeft,
    },
    {
      id: 'unsplit', label: 'Unsplit', icon: Maximize,
      action: () => handleSimpleAction(store.unsplitScreen, isRightSide),
      condition: canUnsplit,
    },
    {id: 'sep2', isSeparator: true, condition: canCloseToLeft || canCloseToRight || canCloseAllExcept},
    {
      id: 'closeAllExcept', label: 'Close all except this', icon: XCircle,
      action: () => handleSimpleAction(store.closeAllExcept, tabId, isRightSide),
      condition: canCloseAllExcept,
    },
    {
      id: 'closeAllLeft', label: 'Close tabs to the left', icon: ChevronLeftSquare,
      action: () => handleSimpleAction(store.closeTabsToLeft, tabId, isRightSide),
      condition: canCloseToLeft,
    },
    {
      id: 'closeAllRight', label: 'Close tabs to the right', icon: ChevronRightSquare,
      action: () => handleSimpleAction(store.closeTabsToRight, tabId, isRightSide),
      condition: canCloseToRight,
    },
  ];

  // Filter out items where condition is false, handle separators based on adjacent items
  const visibleItems: MenuItem[] = [];
  menuItems.forEach((item, index) => {
    // Skip hidden items explicitly marked with condition: false
    if (item.condition === false) return;

    if (item.isSeparator) {
      // Find the *next* potential visible non-separator item
      const nextVisibleItemIndex = menuItems.findIndex((nextItem, nextIndex) =>
        nextIndex > index && nextItem.condition !== false && !nextItem.isSeparator
      );

      // Only add separator if:
      // 1. There was a previous visible item AND it wasn't a separator
      // 2. There is a next visible item
      const prevVisible = visibleItems[visibleItems.length - 1];
      if (prevVisible && !prevVisible.isSeparator && nextVisibleItemIndex !== -1) {
        visibleItems.push(item);
      }
    } else {
      // Regular item, always add if condition isn't false
      visibleItems.push(item);
    }
  });

  // Cleanup trailing separators if any were added unnecessarily
  if (visibleItems.length > 0 && visibleItems[visibleItems.length - 1].isSeparator) {
    visibleItems.pop();
  }

  return visibleItems;
};