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
  const { id: tabId, documentId, workspaceId } = tab;
  const [activeDocument, setActiveDocument] =
    useState<ActiveCanvasDocument | null>(null);
  const [status, setStatus] = useState<CanvasSaveStatus>("loading");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [remoteRevision, setRemoteRevision] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);
    const unsubscribe = canvasDocumentManager.subscribe(tabId, (saveState) => {
      if (!isMounted) return;
      setStatus(saveState.status);
      setRevision(saveState.revision);
      setError(saveState.error ?? null);
      setRemoteRevision(
        saveState.status === "conflict"
          ? (saveState.remoteRevision ?? saveState.revision)
          : null,
      );
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
          session: {
            ...loaded.session,
            viewport: { ...loaded.session.viewport },
          },
        });
        setRevision(loaded.document.revision);
        setStatus("saved");
        setRemoteRevision(null);
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
      void canvasDocumentManager
        .release(tabId)
        .catch((releaseError) =>
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

  const reloadAfterConflict = useCallback(async () => {
    setIsResolvingConflict(true);
    setError(null);
    try {
      const loaded = await canvasDocumentManager.reloadAfterConflict(tabId);
      setActiveDocument({
        document: {
          ...loaded.document,
          items: loaded.document.items.map((item) => ({ ...item })),
        },
        session: {
          ...loaded.session,
          viewport: { ...loaded.session.viewport },
        },
      });
      setReloadKey((current) => current + 1);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Unable to reload this Canvas",
      );
    } finally {
      setIsResolvingConflict(false);
    }
  }, [tabId]);

  const takeOverAfterConflict = useCallback(async () => {
    setIsResolvingConflict(true);
    setError(null);
    try {
      const saved = await canvasDocumentManager.takeOverAfterConflict(tabId);
      setActiveDocument((current) =>
        current
          ? {
              ...current,
              document: {
                ...saved.document,
                items: saved.document.items.map((item) => ({ ...item })),
              },
            }
          : current,
      );
    } catch (takeOverError) {
      setError(
        takeOverError instanceof Error
          ? takeOverError.message
          : "Unable to take over this Canvas",
      );
    } finally {
      setIsResolvingConflict(false);
    }
  }, [tabId]);

  return {
    activeDocument,
    status,
    revision,
    error,
    remoteRevision,
    reloadKey,
    isResolvingConflict,
    saveViewport,
    updateItems,
    reloadAfterConflict,
    takeOverAfterConflict,
  };
};
