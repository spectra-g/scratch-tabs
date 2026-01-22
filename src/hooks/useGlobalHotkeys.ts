import { useEffect } from "react";
import { usePersistenceStore } from "../stores/persistenceStore";
import { useSearchStore } from "../stores/searchStore";
import { useTabsStore } from "../stores/tabsStore";
import { useSplitViewStore } from "../stores/splitViewStore";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useRootStore } from "../stores/rootStore";
import { useSidebarStore } from "../stores/sidebarStore";


interface UseGlobalHotkeysParams {
  /**
   * Callback to show the keyboard close confirmation dialog.
   * Called with tab ID and title when the user presses Ctrl+W on a tab with content.
   */
  onKeyboardCloseConfirmation: (tabId: string, tabTitle: string) => void;
  /**
   * Callback to close a tab without confirmation.
   */
  onTabClose: (tabId: string) => void;
}

/**
 * Hook that handles global keyboard shortcuts:
 * - Ctrl+Shift+F: Open global search (with selected text)
 * - Ctrl+W: Close active tab (with confirmation if has content)
 * - Ctrl+S / Cmd+S: Save state and download active tab as file
 */
export function useGlobalHotkeys({
  onKeyboardCloseConfirmation,
  onTabClose,
}: UseGlobalHotkeysParams): void {
  // Get split view state
  const { splitView, activeLeftTabId, activeRightTabId } =
    useStoreWithEqualityFn(
      useSplitViewStore,
      (state) => ({
        splitView: state.splitView,
        activeLeftTabId: state.splitView?.activeLeftTabId,
        activeRightTabId: state.splitView?.activeRightTabId,
      }),
      shallow,
    );

  // Get persistence actions
  const { saveState } = useStoreWithEqualityFn(
    usePersistenceStore,
    (state) => ({ saveState: state.saveState }),
    shallow,
  );

  // Get root store actions
  const { saveTabDataById } = useStoreWithEqualityFn(
    useRootStore,
    (state) => ({
      saveTabDataById: state.saveTabDataById,
    }),
    shallow,
  );

  // Get search store actions
  const { toggleSearch } = useSearchStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // --- Search Shortcut (Ctrl+Shift+F / Cmd+Shift+F) ---
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "F"
      ) {
        event.preventDefault();
        const selectedText = window.getSelection()?.toString() || "";
        toggleSearch(selectedText);
      }

      // --- Tab Close Shortcut (Ctrl+W) ---
      if (event.ctrlKey && !event.metaKey && event.key === 'w') {
        event.preventDefault();
        event.stopPropagation();

        // Determine which tab should be closed based on active side
        const targetTabId = splitView?.activeSide === 'left'
          ? splitView?.activeLeftTabId
          : splitView?.activeRightTabId;

        if (targetTabId) {
          // Get tabs data only when needed, without subscribing
          const tabs = useTabsStore.getState().tabs;
          const activeTab = tabs.find(tab => tab.id === targetTabId);

          if (activeTab) {
            // Check if confirmation is needed (same logic as SortableTab)
            const needsConfirmation = (activeTab.content && activeTab.content.trim() !== "") || activeTab.isTablet;

            if (needsConfirmation) {
              onKeyboardCloseConfirmation(targetTabId, activeTab.title);
            } else {
              onTabClose(targetTabId);
            }
          }
        }
      }

      // --- Save Shortcut (Ctrl+S / Cmd+S) ---
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        event.stopPropagation();
        saveState();

        // Determine which side is active
        const activeSide = splitView?.activeSide || 'left';
        const tabIdToSave = activeSide === "left" ? activeLeftTabId : activeRightTabId;

        if (tabIdToSave) {
          // Save tab data to persistence and download the file
          // Note: saveTabDataById already handles the download
          saveTabDataById(tabIdToSave);
        }
      }

      // --- Sidebar Toggle Shortcut (Ctrl+B / Cmd+B) ---
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "b" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        useSidebarStore.getState().toggleSidebar();
      }
    };


    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    saveState,
    toggleSearch,
    activeLeftTabId,
    activeRightTabId,
    saveTabDataById,
    splitView?.activeSide,
    splitView?.activeLeftTabId,
    splitView?.activeRightTabId,
    onKeyboardCloseConfirmation,
    onTabClose,
  ]);
}
