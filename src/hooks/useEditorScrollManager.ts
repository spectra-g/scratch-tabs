import React, { useRef, useEffect, useCallback } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useTabsStore } from "../stores/tabsStore"; // To get the list of current tabs for cleanup

// Store scroll positions outside the hook's state, using a ref
// This persists across re-renders without causing them.
const scrollPositions: { [tabId: string]: number } = {};

export const useEditorScrollManager = (
  // Ref pointing to the Monaco editor instance
  editorRef: React.RefObject<Monaco.editor.IStandaloneCodeEditor | null>,
  // The ID of the currently active tab in the editor instance this hook serves
  activeTabId: string | null,
) => {
  // Ref to store the *previous* activeTabId to correctly save scroll on change
  const previousActiveTabIdRef = useRef<string | null>(activeTabId);

  // Get the current list of tabs from the store for cleanup purposes
  const currentTabIds = useTabsStore((state) => {
    const tabIds = new Set(state.tabs.map((tab) => tab.id));
    return tabIds;
  });

  // Effect to SAVE scroll position when the active tab changes or component unmounts
  useEffect(() => {
    // Update the ref whenever activeTabId changes
    const previousTabId = previousActiveTabIdRef.current;
    previousActiveTabIdRef.current = activeTabId;

    // Return cleanup function
    return () => {
      // Save the scroll position of the *tab we are leaving*
      if (previousTabId && editorRef.current) {
        const scrollTop = editorRef.current.getScrollTop();
        scrollPositions[previousTabId] = scrollTop;
      }
    };
  }, [activeTabId, editorRef]); // Rerun when the active tab or editor instance changes

  // Function to RESTORE scroll position for a given tabId
  const restoreScrollPosition = useCallback(
    (tabId: string) => {
      if (editorRef.current && tabId && scrollPositions.hasOwnProperty(tabId)) {
        const savedPosition = scrollPositions[tabId] ?? 0;

        // Use requestAnimationFrame to ensure the editor layout is stable before setting scroll
        // This can prevent issues where setScrollTop is called too early.
        requestAnimationFrame(() => {
          // Double-check editorRef.current still exists inside the animation frame
          editorRef.current?.setScrollTop(savedPosition);
        });
      } else if (editorRef.current) {
        // If no saved position, scroll to top
        requestAnimationFrame(() => {
          editorRef.current?.setScrollTop(0);
        });
      }
    },
    [editorRef],
  ); // Dependency: only the editorRef

  // Effect to CLEAN UP scroll positions for tabs that no longer exist
  useEffect(() => {
    const storedTabIds = Object.keys(scrollPositions);
    let cleaned = false;
    storedTabIds.forEach((storedId) => {
      if (!currentTabIds.has(storedId)) {
        delete scrollPositions[storedId];
        cleaned = true;
      }
    });
  }, [currentTabIds]); // Rerun when the set of current tab IDs changes

  // Return the function needed by the component
  return { restoreScrollPosition };
};
