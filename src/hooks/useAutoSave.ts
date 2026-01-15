/**
 * useAutoSave Hook
 *
 * Sets up periodic auto-save interval for persistence store.
 * Saves state every 2.5 seconds and updates the test indicator.
 *
 * Extracted from MainLayout to improve separation of concerns.
 */

import { useEffect } from "react";
import { usePersistenceStore } from "../stores/persistenceStore";
import { updateSaveIndicator } from "../utils/testIndicators";

const AUTO_SAVE_INTERVAL_MS = 2500;

/**
 * Sets up periodic auto-save interval
 * @param enabled - Whether auto-save should be active (default: true)
 */
export const useAutoSave = (enabled: boolean = true): void => {
  useEffect(() => {
    if (!enabled) return;

    const saveInterval = setInterval(async () => {
      // Use getState to ensure we always get the latest version of the saveState function
      // and prevent issues with stale closures.
      await usePersistenceStore.getState().saveState();

      // Update test indicator after save completes
      updateSaveIndicator();
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      clearInterval(saveInterval);
    };
  }, [enabled]);
};
