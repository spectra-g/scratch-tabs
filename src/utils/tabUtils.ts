import { Tab } from '../types';

/**
 * Generates a new unique ID for a tab
 */
export function generateTabId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a new tab with default values
 * @param options Optional properties to override defaults
 */
export function createTab(options: Partial<Tab> = {}): Tab {
  return {
    id: generateTabId(),
    title: 'Untitled',
    content: '',
    language: 'plaintext',
    languageLocked: false,
    ...options
  };
}

/**
 * Creates a duplicate of an existing tab with a new ID
 * @param tab The tab to duplicate
 * @param suffix Optional suffix to add to the title (default: " (copy)")
 */
export function duplicateTab(tab: Tab, suffix: string = " (copy)"): Tab {
  return {
    ...tab,
    id: generateTabId(),
    title: `${tab.title}${suffix}`
  };
}

/**
 * Checks if a tab is empty (has no content)
 * @param tab The tab to check
 */
export function isTabEmpty(tab: Tab): boolean {
  return tab.isTablet ? false : tab.content.trim() === '';
}

/**
 * Counts the number of empty tabs in an array of tabs
 * @param tabs Array of tabs to check
 */
export function countEmptyTabs(tabs: Tab[]): number {
  return tabs.filter(isTabEmpty).length;
}

/**
 * Finds a tab by its ID
 * @param tabs Array of tabs to search
 * @param id ID of the tab to find
 */
export function findTabById(tabs: Tab[], id: string): Tab | undefined {
  return tabs.find(tab => tab.id === id);
}

/**
 * Gets tab IDs from an array of tabs
 * @param tabs Array of tabs
 */
export function getTabIds(tabs: Tab[]): string[] {
  return tabs.map(tab => tab.id);
}

/**
 * Gets tabs from an array of tab IDs
 * @param allTabs All available tabs
 * @param tabIds IDs of tabs to retrieve
 */
export function getTabsFromIds(allTabs: Tab[], tabIds: string[]): Tab[] {
  return tabIds.map(id => findTabById(allTabs, id)).filter((tab): tab is Tab => tab !== undefined);
} 