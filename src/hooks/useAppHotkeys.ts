/**
 * useAppHotkeys Hook
 *
 * Encapsulates keyboard shortcut handling with close confirmation state.
 * Combines useGlobalHotkeys with the confirmation dialog state management.
 *
 * Extracted from MainLayout to improve separation of concerns.
 */

import { useState, useCallback } from "react";
import { useGlobalHotkeys } from "./useGlobalHotkeys";
import { useRootStore } from "../stores/rootStore";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

export interface KeyboardCloseConfirmation {
  isOpen: boolean;
  tabId: string;
  tabTitle: string;
}

export interface UseAppHotkeysReturn {
  /**
   * Current state of the keyboard close confirmation dialog
   */
  keyboardCloseConfirmation: KeyboardCloseConfirmation | null;
  /**
   * Handler to confirm tab close from keyboard shortcut
   */
  handleKeyboardCloseConfirm: () => void;
  /**
   * Handler to cancel tab close from keyboard shortcut
   */
  handleKeyboardCloseCancel: () => void;
}

/**
 * Hook that manages app-level keyboard shortcuts with confirmation handling.
 * Sets up Ctrl+W, Ctrl+S, Ctrl+Shift+F shortcuts.
 *
 * @returns State and handlers for keyboard close confirmation dialog
 */
export function useAppHotkeys(): UseAppHotkeysReturn {
  // State for keyboard shortcut confirmation dialog
  const [keyboardCloseConfirmation, setKeyboardCloseConfirmation] =
    useState<KeyboardCloseConfirmation | null>(null);

  // Get removeTab from root store
  const { removeTab } = useStoreWithEqualityFn(
    useRootStore,
    (state) => ({ removeTab: state.removeTab }),
    shallow
  );

  // Tab close handler for keyboard shortcut
  const handleTabClose = useCallback(
    (tabId: string) => {
      removeTab(tabId);
    },
    [removeTab]
  );

  // Keyboard close confirmation callback for useGlobalHotkeys
  const handleKeyboardCloseConfirmation = useCallback(
    (tabId: string, tabTitle: string) => {
      setKeyboardCloseConfirmation({
        isOpen: true,
        tabId,
        tabTitle,
      });
    },
    []
  );

  // Confirm handler - closes the tab and dismisses dialog
  const handleKeyboardCloseConfirm = useCallback(() => {
    if (keyboardCloseConfirmation) {
      handleTabClose(keyboardCloseConfirmation.tabId);
      setKeyboardCloseConfirmation(null);
    }
  }, [keyboardCloseConfirmation, handleTabClose]);

  // Cancel handler - just dismisses dialog
  const handleKeyboardCloseCancel = useCallback(() => {
    setKeyboardCloseConfirmation(null);
  }, []);

  // Set up global keyboard shortcuts
  useGlobalHotkeys({
    onKeyboardCloseConfirmation: handleKeyboardCloseConfirmation,
    onTabClose: handleTabClose,
  });

  return {
    keyboardCloseConfirmation,
    handleKeyboardCloseConfirm,
    handleKeyboardCloseCancel,
  };
}
