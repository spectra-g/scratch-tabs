import { create } from "zustand";
import { getSetting, setSetting } from "../db";

/**
 * Represents a single entry in the navigation history.
 * Tracks workspace + tab combination for back/forward navigation.
 */
export interface NavigationEntry {
  workspaceId: string;
  tabId: string;
  timestamp: number;
}

interface NavigationStore {
  // State
  history: NavigationEntry[];
  currentIndex: number;
  isLoaded: boolean;

  // Actions
  pushEntry: (workspaceId: string, tabId: string) => void;
  goBack: () => NavigationEntry | null;
  goForward: () => NavigationEntry | null;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  loadHistory: () => Promise<void>;
  clearHistory: () => void;
}

const NAVIGATION_HISTORY_KEY = "navigation_history_v1";
const MAX_HISTORY_SIZE = 50;

/**
 * Persists history to IndexedDB settings table.
 */
const persistHistory = async (history: NavigationEntry[], currentIndex: number) => {
  try {
    const data = JSON.stringify({ history, currentIndex });
    await setSetting(NAVIGATION_HISTORY_KEY, data);
  } catch (error) {
    console.error("Failed to persist navigation history:", error);
  }
};

/**
 * Navigation history store.
 * Tracks user's journey through workspaces and tabs for back/forward navigation.
 *
 * Design Principles (SRP):
 * - ONLY manages history state (array + index)
 * - DOES NOT perform navigation (that's navigationService's job)
 * - DOES NOT integrate with other stores (that's rootStore's job)
 */
export const useNavigationStore = create<NavigationStore>((set, get) => ({
  history: [],
  currentIndex: -1,
  isLoaded: false,

  /**
   * Load history from IndexedDB on app start.
   */
  loadHistory: async () => {
    try {
      const data = await getSetting(NAVIGATION_HISTORY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          history: parsed.history || [],
          currentIndex: parsed.currentIndex ?? -1,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error("Failed to load navigation history:", error);
      set({ isLoaded: true });
    }
  },

  /**
   * Push a new entry to history.
   * - Removes all forward history if we're in the middle of the stack
   * - Deduplicates consecutive identical entries
   * - Limits history size to MAX_HISTORY_SIZE
   * - Persists to IndexedDB
   */
  pushEntry: (workspaceId, tabId) => {
    const { history, currentIndex } = get();

    // Skip if identical to current entry (avoid duplicate consecutive entries)
    if (currentIndex >= 0) {
      const current = history[currentIndex];
      if (current.workspaceId === workspaceId && current.tabId === tabId) {
        return;
      }
    }

    // Truncate future history (we're creating a new branch)
    const newHistory = history.slice(0, currentIndex + 1);

    // Add new entry
    newHistory.push({ workspaceId, tabId, timestamp: Date.now() });

    // Limit size (FIFO: remove oldest if over limit)
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    const newIndex = newHistory.length - 1;

    set({
      history: newHistory,
      currentIndex: newIndex,
    });

    // Persist asynchronously (don't block UI)
    persistHistory(newHistory, newIndex);
  },

  /**
   * Move back in history.
   * Returns the entry to navigate to, or null if at the beginning.
   */
  goBack: () => {
    const { currentIndex, history } = get();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      set({ currentIndex: newIndex });

      // Persist the index change
      persistHistory(history, newIndex);

      return history[newIndex];
    }
    return null;
  },

  /**
   * Move forward in history.
   * Returns the entry to navigate to, or null if at the end.
   */
  goForward: () => {
    const { currentIndex, history } = get();
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      set({ currentIndex: newIndex });

      // Persist the index change
      persistHistory(history, newIndex);

      return history[newIndex];
    }
    return null;
  },

  /**
   * Check if we can go back.
   */
  canGoBack: () => get().currentIndex > 0,

  /**
   * Check if we can go forward.
   */
  canGoForward: () => get().currentIndex < get().history.length - 1,

  /**
   * Clear all history (useful for testing or reset).
   */
  clearHistory: () => {
    set({ history: [], currentIndex: -1 });
    persistHistory([], -1);
  },
}));
