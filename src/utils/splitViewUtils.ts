import { SplitViewState } from '../types';
import { findTabById } from './tabUtils';
import { Tab } from '../types';

/**
 * Creates a default split view state
 */
export function createDefaultSplitViewState(): SplitViewState {
  return {
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    splitRatio: 0.5,
  };
}

/**
 * Checks if a tab is in the left side of the split view
 * @param splitView The split view state
 * @param tabId The ID of the tab to check
 */
export function isTabInLeftSide(splitView: SplitViewState, tabId: string): boolean {
  return splitView.leftTabs.includes(tabId);
}

/**
 * Checks if a tab is in the right side of the split view
 * @param splitView The split view state
 * @param tabId The ID of the tab to check
 */
export function isTabInRightSide(splitView: SplitViewState, tabId: string): boolean {
  return splitView.rightTabs.includes(tabId);
}

/**
 * Gets the side of the split view that a tab is in
 * @param splitView The split view state
 * @param tabId The ID of the tab to check
 * @returns 'left', 'right', or null if the tab is not in the split view
 */
export function getTabSide(splitView: SplitViewState, tabId: string): 'left' | 'right' | null {
  if (isTabInLeftSide(splitView, tabId)) return 'left';
  if (isTabInRightSide(splitView, tabId)) return 'right';
  return null;
}

/**
 * Gets the active tab ID for a side of the split view
 * @param splitView The split view state
 * @param side The side to get the active tab ID for
 */
export function getActiveSideTabId(splitView: SplitViewState, side: 'left' | 'right'): string | null {
  return side === 'left' ? splitView.activeLeftTabId : splitView.activeRightTabId;
}

/**
 * Gets the tabs for a side of the split view
 * @param splitView The split view state
 * @param side The side to get the tabs for
 */
export function getSideTabs(splitView: SplitViewState, side: 'left' | 'right'): string[] {
  return side === 'left' ? splitView.leftTabs : splitView.rightTabs;
}

/**
 * Gets all tab IDs from the split view
 * @param splitView The split view state
 */
export function getAllTabIds(splitView: SplitViewState): string[] {
  return [...splitView.leftTabs, ...splitView.rightTabs];
}

/**
 * Groups tabs by language for a side of the split view
 * @param tabs All available tabs
 * @param tabIds IDs of tabs to group
 */
export function groupTabsByLanguage(tabs: Tab[], tabIds: string[]): string[] {
  // Create a map of language -> tab IDs
  const languageMap: Record<string, string[]> = {};
  
  // Group tabs by language
  tabIds.forEach(id => {
    const tab = findTabById(tabs, id);
    if (!tab) return;
    
    const language = tab.language || 'plaintext';
    if (!languageMap[language]) {
      languageMap[language] = [];
    }
    languageMap[language].push(id);
  });
  
  // Flatten the map back to an array, preserving the order of languages
  const languages = Object.keys(languageMap);
  const result: string[] = [];
  
  languages.forEach(language => {
    result.push(...languageMap[language]);
  });
  
  return result;
} 