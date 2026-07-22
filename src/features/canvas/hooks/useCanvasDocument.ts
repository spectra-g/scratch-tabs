import { useCallback, useEffect, useState } from "react";
import type { Tab } from "../../../types";
import { useRootStore } from "../../../stores/rootStore";
import { canvasDocumentManager } from "../services/CanvasDocumentManager";
import type {
  ActiveCanvasDocument,
  CanvasItem,
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
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);
    const unsubscribe = canvasDocumentManager.subscribe(tabId, (saveState) => {
      if (!isMounted) return;
      setStatus(saveState.status);
      setRevision(saveState.revision);
      setError(saveState.error ?? null);
      if (saveState.lastModified !== undefined) {
        useRootStore.getState().updateTabState(tabId, {
          lastModified: saveState.lastModified,
        });
      }
      setActiveDocument((current) =>
        current
          ? {
              ...current,
              document: {
                ...current.document,
                revision: saveState.revision,
                updatedAt: saveState.lastModified ?? current.document.updatedAt,
              },
            }
          : current,
      );
    });

    canvasDocumentManager
      .acquire({ id: tabId, documentId, workspaceId })
      .then((loaded) => {
        if (!isMounted) return;
        setActiveDocument({
          document: {
            ...loaded.document,
            items: loaded.document.items.map((item) => ({ ...item })),
          },
          session: { ...loaded.session, viewport: { ...loaded.session.viewport } },
        });
        setRevision(loaded.document.revision);
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
      unsubscribe();
      void canvasDocumentManager.release(tabId).catch((releaseError) =>
        console.error("Failed to dispose Canvas session:", releaseError),
      );
    };
  }, [tabId, documentId, workspaceId]);

  const saveViewport = useCallback(
    async (viewport: CanvasViewport) => {
      try {
        await canvasDocumentManager.saveViewport(tabId, viewport);
      } catch (saveError) {
        setStatus("error");
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

  const updateItems = useCallback(
    (items: CanvasItem[]) => {
      setError(null);
      const document = canvasDocumentManager.setItems(tabId, items);
      setActiveDocument((current) =>
        current
          ? {
              ...current,
              document: {
                ...document,
                items: document.items.map((item) => ({ ...item })),
              },
            }
          : current,
      );
    },
    [tabId],
  );

  return {
    activeDocument,
    status,
    revision,
    error,
    saveViewport,
    updateItems,
  };
};
