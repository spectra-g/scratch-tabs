import { useCallback } from "react";
import { COPY_FEEDBACK_DURATION_MS } from "../constants";
import {
  type CanvasCopyState,
  useCanvasCopyFeedback,
} from "./useCanvasCopyFeedback";

export type CanvasCodeCopyState = CanvasCopyState;

export const useCanvasCodeCopy = (
  source: string,
  feedbackDuration = COPY_FEEDBACK_DURATION_MS,
) => {
  const writeSource = useCallback(
    () => navigator.clipboard.writeText(source),
    [source],
  );
  const { state, copy: copyWithFeedback } = useCanvasCopyFeedback(
    writeSource,
    feedbackDuration,
  );
  const copy = useCallback(async () => {
    try {
      await copyWithFeedback();
    } catch {
      // Failure is represented by the feedback state for code-card actions.
    }
  }, [copyWithFeedback]);

  return { state, copy };
};
