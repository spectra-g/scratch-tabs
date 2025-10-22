import { Tab } from "../types";

/**
 * Gets all JSON tabs from the current workspace, excluding the current tab.
 * Returns tabs sorted by last accessed time (most recent first).
 *
 * @param tabs - All tabs in the store
 * @param currentTabId - ID of the current tab to exclude
 * @param currentWorkspaceId - ID of the current workspace
 * @returns Array of JSON tabs sorted by most recent first
 */
export const getRecentJsonTabs = (
  tabs: Tab[],
  currentTabId: string,
  currentWorkspaceId: string
): Tab[] => {
  return tabs
    .filter((tab) =>
      // Filter criteria:
      // 1. Must be in current workspace
      // 2. Must not be the current tab
      // 3. Must not be a tablet
      // 4. Must have JSON language
      tab.workspaceId === currentWorkspaceId &&
      tab.id !== currentTabId &&
      !tab.isTablet &&
      tab.language === "json"
    )
    .sort((a, b) =>
      // Sort by lastModified descending (most recent first)
      (b.lastModified || 0) - (a.lastModified || 0)
    );
};

/**
 * Checks if a string contains valid JSON
 *
 * @param content - String to check
 * @returns true if the content is valid JSON
 */
export const isValidJson = (content: string): boolean => {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
};
