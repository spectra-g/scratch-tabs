/**
 * Utility functions for diff modal operations
 */

/**
 * Determines the correct left-to-right order for tabs in a diff modal.
 * Ensures tabs appear in their natural visual order (leftmost tab on left side of diff).
 *
 * @param tabList - Array of tab IDs in their visual order
 * @param currentTabId - The right-clicked/selected tab
 * @param previousTabId - The previous tab to compare with
 * @returns Object with leftTabId and rightTabId in correct visual order
 */
export const getTabsInVisualOrder = (
  tabList: string[],
  currentTabId: string,
  previousTabId: string
): { leftTabId: string; rightTabId: string } => {
  const currentTabIndex = tabList.indexOf(currentTabId);
  const previousTabIndex = tabList.indexOf(previousTabId);

  // If previousTab appears before (to the left of) currentTab, put it on the left in diff
  const shouldSwap = previousTabIndex < currentTabIndex;

  return {
    leftTabId: shouldSwap ? previousTabId : currentTabId,
    rightTabId: shouldSwap ? currentTabId : previousTabId,
  };
};
