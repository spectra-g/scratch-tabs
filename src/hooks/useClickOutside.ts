// src/hooks/useClickOutside.ts
import { useEffect, RefObject } from "react";

export function useClickOutside(
  refs: RefObject<HTMLElement>[] | RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Check if the click target is a valid Node
      if (!(event.target instanceof Node)) {
        return;
      }

      // Normalize refs to array
      const refsArray = Array.isArray(refs) ? refs : [refs];

      // Check if the click was inside any of the refs
      const clickedInside = refsArray.some((ref) => {
        return ref.current && ref.current.contains(event.target as Node);
      });

      // If clicked outside all refs, call the handler
      if (!clickedInside) {
        handler(event);
      }
    };

    // Use capture phase to ensure we get the event before other handlers
    document.addEventListener("mousedown", listener, true);
    document.addEventListener("touchstart", listener, true);

    return () => {
      document.removeEventListener("mousedown", listener, true);
      document.removeEventListener("touchstart", listener, true);
    };
  }, [refs, handler]);
}
