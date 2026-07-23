import { useCallback, useEffect, useRef, useState } from "react";
import { COPY_FEEDBACK_DURATION_MS } from "../constants";

export type CanvasCopyState = "idle" | "copied" | "failed";

export const useCanvasCopyFeedback = (
  copyAction: () => Promise<void>,
  feedbackDuration = COPY_FEEDBACK_DURATION_MS,
) => {
  const [state, setState] = useState<CanvasCopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  const copy = useCallback(async () => {
    clearResetTimer();
    try {
      await copyAction();
      setState("copied");
    } catch (error) {
      setState("failed");
      throw error;
    } finally {
      resetTimerRef.current = setTimeout(
        () => setState("idle"),
        feedbackDuration,
      );
    }
  }, [clearResetTimer, copyAction, feedbackDuration]);

  return { state, copy };
};
