import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { Tab } from "../types";

/**
 * Time window (ms) to detect if a tab was just created from paste or import.
 * Tabs created within this window will be auto-formatted.
 */
const NEW_TAB_DETECTION_WINDOW_MS = 500;

/**
 * Minimum content length to trigger auto-formatting.
 */
const MIN_CONTENT_LENGTH_FOR_FORMAT = 50;

/**
 * Delay before running auto-format to ensure editor is stable.
 */
const AUTO_FORMAT_DELAY_MS = 100;

interface UseAutoFormatOnLoadParams {
  /** The Monaco editor instance */
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  /** The active tab */
  activeTab: Tab | null;
}

/**
 * Checks if a tab should be auto-formatted based on various criteria.
 *
 * @param tab - The tab to check
 * @returns true if the tab should be auto-formatted
 */
function shouldAutoFormat(tab: Tab): boolean {
  const now = Date.now();
  const isNewTab = now - tab.dateCreated < NEW_TAB_DETECTION_WINDOW_MS;

  if (!isNewTab) {
    return false;
  }

  const content = tab.content || "";
  const hasSubstantialContent =
    content.trim().length > MIN_CONTENT_LENGTH_FOR_FORMAT;
  const isFormattableLanguage = tab.language !== "plaintext";
  const isNotTablet = !tab.isTablet;
  const isNotLikelyDuplicate =
    !tab.title.includes("(copy)") && !tab.title.includes("Copy of");

  return (
    hasSubstantialContent &&
    isFormattableLanguage &&
    isNotTablet &&
    isNotLikelyDuplicate
  );
}

/**
 * Hook that auto-formats newly created tabs on editor mount.
 * Only formats tabs that were likely created from paste or file import.
 *
 * Criteria for auto-formatting:
 * - Tab was created within the last 500ms
 * - Tab has substantial content (> 50 characters)
 * - Tab language is not plaintext
 * - Tab is not a tablet
 * - Tab is not a duplicate (title doesn't contain "copy")
 *
 * @param params - Configuration for auto-format behavior
 */
export function useAutoFormatOnLoad({
  editor,
  activeTab,
}: UseAutoFormatOnLoadParams): void {
  // Track the tab ID that we've already auto-formatted to prevent duplicate formatting
  const formattedTabIdRef = useRef<string | null>(null);
  // Track the timeout for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending timeout on re-run or unmount
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Guards
    if (!editor || !activeTab) {
      return;
    }

    // Don't re-format the same tab
    if (formattedTabIdRef.current === activeTab.id) {
      return;
    }

    // Check if we should auto-format
    if (!shouldAutoFormat(activeTab)) {
      return;
    }

    // Schedule auto-format with delay
    timeoutRef.current = setTimeout(() => {
      try {
        const formatAction = editor.getAction("editor.action.formatDocument");
        if (formatAction) {
          formatAction.run();
          // Mark this tab as formatted
          formattedTabIdRef.current = activeTab.id;
        }
      } catch (error) {
        console.warn("[useAutoFormatOnLoad] Failed to auto-format document:", error);
      }
    }, AUTO_FORMAT_DELAY_MS);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [editor, activeTab?.id, activeTab?.dateCreated, activeTab?.content, activeTab?.language, activeTab?.isTablet, activeTab?.title]);
}
