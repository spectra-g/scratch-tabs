import { useEffect } from "react";
import { canvasLifecycleCoordinator } from "../services/canvasLifecycleCoordinator";

type FlushActiveCanvasDocuments = () => Promise<void>;

const defaultFlush: FlushActiveCanvasDocuments = () =>
  canvasLifecycleCoordinator.flushActiveDocuments();

export const useCanvasLifecycleFlush = (
  flushActiveDocuments: FlushActiveCanvasDocuments = defaultFlush,
): void => {
  useEffect(() => {
    const flush = () => {
      void flushActiveDocuments().catch((error) =>
        console.error("Failed to flush active Canvas documents:", error),
      );
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [flushActiveDocuments]);
};
