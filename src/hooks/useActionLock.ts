import { useState, useCallback } from "react";

/**
 * Hook for managing async action locks to prevent UI interactions during operations
 * Commonly used to prevent modals from closing while async actions are in progress
 */
export const useActionLock = () => {
  const [isLocked, setIsLocked] = useState(false);

  const withLock = useCallback(
    async (asyncFn: () => Promise<void>) => {
      if (isLocked) return;

      setIsLocked(true);
      try {
        await asyncFn();
      } catch (error) {
        console.error("Action lock caught an error:", error);
        // Re-throw to allow caller to handle if needed
        throw error;
      } finally {
        // A short delay can help UI transitions feel smoother
        setTimeout(() => setIsLocked(false), 150);
      }
    },
    [isLocked],
  );

  return { isLocked, withLock };
};
