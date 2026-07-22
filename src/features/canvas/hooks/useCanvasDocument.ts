import { useCallback, useEffect, useState } from "react";
import type { Tab } from "../../../types";
import { canvasDocumentManager } from "../services/CanvasDocumentManager";
import type {
  ActiveCanvasDocument,
  CanvasSaveStatus,
  CanvasViewport,
} from "../types";

export const useCanvasDocument = (tab: Tab) => {
  const {
    id: tabId,
    documentId,
    workspaceId,
  } = tab;
  const [activeDocument, setActiveDocument] =
    useState<ActiveCanvasDocument | null>(null);
  const [status, setStatus] = useState<CanvasSaveStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);

    canvasDocumentManager
      .acquire({ id: tabId, documentId, workspaceId })
      .then((loaded) => {
        if (!isMounted) return;
        setActiveDocument(loaded);
        setStatus("saved");
      })
      .catch((loadError: unknown) => {
        if (!isMounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this Canvas",
        );
        setStatus("error");
      });

    return () => {
      isMounted = false;
      void canvasDocumentManager.release(tabId).catch((releaseError) =>
        console.error("Failed to dispose Canvas session:", releaseError),
      );
    };
  }, [tabId, documentId, workspaceId]);

  const saveViewport = useCallback(
    async (viewport: CanvasViewport) => {
      setStatus("saving");
      setError(null);
      try {
        await canvasDocumentManager.saveViewport(tabId, viewport);
        setStatus("saved");
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save this Canvas",
        );
        setStatus("error");
      }
    },
    [tabId],
  );

  return { activeDocument, status, error, saveViewport };
};
