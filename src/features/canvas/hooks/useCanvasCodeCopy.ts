import { useCallback, useEffect, useRef, useState } from "react";
import { COPY_FEEDBACK_DURATION_MS } from "../constants";

export type CanvasCodeCopyState = "idle" | "copied" | "failed";

export const useCanvasCodeCopy = (
  source: string,
  feedbackDuration = COPY_FEEDBACK_DURATION_MS,
) => {
  const [state, setState] = useState<CanvasCodeCopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  const copy = useCallback(async () => {
    clearResetTimer();
    try {
      await navigator.clipboard.writeText(source);
      setState("copied");
    } catch {
      setState("failed");
    }
    resetTimerRef.current = setTimeout(
      () => setState("idle"),
      feedbackDuration,
    );
  }, [clearResetTimer, feedbackDuration, source]);

  return { state, copy };
};
