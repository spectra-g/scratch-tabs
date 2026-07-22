import { useEffect } from "react";
import { usePersistenceStore } from "../stores/persistenceStore";
import { useSearchStore } from "../stores/searchStore";
import { useTabsStore } from "../stores/tabsStore";
import { useSplitViewStore } from "../stores/splitViewStore";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useRootStore } from "../stores/rootStore";
import { useSidebarStore } from "../stores/sidebarStore";
import { shouldConfirmTabClose } from "../services/tabCloseProtection";


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
 * - Ctrl+Shift+-: Navigate back in history
 * - Ctrl+Shift+=: Navigate forward in history
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
  const { saveTabDataById, navigateBack, navigateForward } = useStoreWithEqualityFn(
    useRootStore,
    (state) => ({
      saveTabDataById: state.saveTabDataById,
      navigateBack: state.navigateBack,
      navigateForward: state.navigateForward,
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
            void shouldConfirmTabClose(activeTab, false).then(
              (needsConfirmation) => {
                if (needsConfirmation) {
                  onKeyboardCloseConfirmation(targetTabId, activeTab.title);
                } else {
                  onTabClose(targetTabId);
                }
              },
            );
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

      // --- Navigate Back (Ctrl+Shift+-) ---
      // Note: Shift+- produces "_" character, but also check for "-" and the code
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        (event.key === "_" || event.key === "-" || event.code === "Minus")
      ) {
        event.preventDefault();
        navigateBack();
      }

      // --- Navigate Forward (Ctrl+Shift+=) ---
      // Note: Shift+= produces "+" character, but also check for "=" and the code
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        (event.key === "+" || event.key === "=" || event.code === "Equal")
      ) {
        event.preventDefault();
        navigateForward();
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
    navigateBack,
    navigateForward,
    splitView?.activeSide,
    splitView?.activeLeftTabId,
    splitView?.activeRightTabId,
    onKeyboardCloseConfirmation,
    onTabClose,
  ]);
}
