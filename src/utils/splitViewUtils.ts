import { SplitViewState } from "../types";
import { findTabById } from "./tabUtils";
import { Tab } from "../types";

/**
 * Generates a UUID, with fallback for environments where crypto.randomUUID is not available
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Jest/Node.js environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a default split view state
 */
export function createDefaultSplitViewState(
  workspaceId?: string,
): SplitViewState {
  return {
    id: generateUUID(),
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    activeSide: "left",
    splitRatio: 0.5,
    leftTabHistory: [],
    rightTabHistory: [],
    workspaceId: workspaceId || "default",
  };
}

/**
 * Updates tab history when a tab becomes active
 */
export function updateTabHistory(
  history: string[] | undefined | null,
  tabId: string,
): string[] {
  if (!history) {
    return [tabId];
  }
  return [tabId, ...history.filter((id) => id !== tabId)];
}

/**
 * Gets the previous active tab from history, falling back to first tab if no history
 */
export function getPreviousActiveTab(
  history: string[] | undefined | null,
  currentTabs: string[],
): string | null {
  if (!history || history.length === 0) {
    return currentTabs[0] || null;
  }

  // Filter history to only include tabs that still exist
  const validHistory = history.filter((id) => currentTabs.includes(id));

  // Return first valid tab from history or fall back to first tab
  return validHistory[0] || currentTabs[0] || null;
}

/**
 * Removes a tab from history
 */
export function removeTabFromHistory(
  history: string[] | undefined | null,
  tabId: string,
): string[] {
  if (!history) {
    return [];
  }
  return history.filter((id) => id !== tabId);
}

/**
 * Checks if a tab is in the left side of the split view
 */
export function isTabInLeftSide(
  splitView: SplitViewState,
  tabId: string,
): boolean {
  return splitView.leftTabs.includes(tabId);
}

/**
 * Checks if a tab is in the right side of the split view
 */
export function isTabInRightSide(
  splitView: SplitViewState,
  tabId: string,
): boolean {
  return splitView.rightTabs.includes(tabId);
}

/**
 * Gets the side of the split view that a tab is in
 */
export function getTabSide(
  splitView: SplitViewState,
  tabId: string,
): "left" | "right" | null {
  if (isTabInLeftSide(splitView, tabId)) return "left";
  if (isTabInRightSide(splitView, tabId)) return "right";
  return null;
}

/**
 * Gets the active tab ID for a side of the split view
 */
export function getActiveSideTabId(
  splitView: SplitViewState,
  side: "left" | "right",
): string | null {
  return side === "left"
    ? splitView.activeLeftTabId
    : splitView.activeRightTabId;
}

/**
 * Gets the tabs for a side of the split view
 */
export function getSideTabs(
  splitView: SplitViewState,
  side: "left" | "right",
): string[] {
  return side === "left" ? splitView.leftTabs : splitView.rightTabs;
}

/**
 * Gets all tab IDs from the split view
 */
export function getAllTabIds(splitView: SplitViewState): string[] {
  return [...splitView.leftTabs, ...splitView.rightTabs];
}

/**
 * Groups tabs by language for a side of the split view
 */
export function groupTabsByLanguage(tabs: Tab[], tabIds: string[]): string[] {
  // Create a map of language -> tab IDs
  const languageMap: Record<string, string[]> = {};

  // Group tabs by language
  tabIds.forEach((id) => {
    const tab = findTabById(tabs, id);
    if (!tab) return;

    const language = tab.language || "plaintext";
    if (!languageMap[language]) {
      languageMap[language] = [];
    }
    languageMap[language].push(id);
  });

  // Flatten the map back to an array, preserving the order of languages
  const languages = Object.keys(languageMap);
  const result: string[] = [];

  languages.forEach((language) => {
    result.push(...languageMap[language]);
  });

  return result;
}
