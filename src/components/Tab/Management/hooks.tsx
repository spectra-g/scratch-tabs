import { useEffect } from "react";

/**
 * Custom hook for handling clicks outside a modal
 */
export const useModalClickOutside = (
  ref: React.RefObject<HTMLElement>,
  modalOpenFlag: boolean,
  handler: (event: MouseEvent | TouchEvent) => void,
  shouldCheckCondition?: () => boolean,
) => {
  useEffect(() => {
    if (!modalOpenFlag) return; // Only attach listener if modal is open

    const listener = (event: MouseEvent | TouchEvent) => {
      // Check any additional conditions
      if (shouldCheckCondition && !shouldCheckCondition()) {
        return;
      }

      if (!ref.current || ref.current.contains(event.target as Node)) {
        return; // Click was inside the ref or ref missing
      }
      handler(event); // Click was outside
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
    // Re-attach if modalOpenFlag or handler changes
  }, [ref, modalOpenFlag, handler, shouldCheckCondition]);
};
