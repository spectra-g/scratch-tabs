import { useCallback, useRef, useState, type RefObject } from "react";
import type { Viewport } from "@xyflow/react";
import type { Tab } from "../../../types";
import { canvasIngestService } from "../services/CanvasIngestService";
import type { CanvasItem } from "../types";
import type { CanvasClipboardPayload } from "../utils/canvasClipboard";
import {
  getCanvasViewportCenter,
  screenPointToCanvasPoint,
} from "../utils/canvasCoordinates";
import type { CanvasNormalizedInput } from "../utils/clipboardClassification";
import type { CanvasPoint } from "../utils/canvasItemFactory";

interface UseCanvasIngestOptions {
  rootRef: RefObject<HTMLDivElement>;
  viewportRef: RefObject<Viewport>;
  tab: Pick<Tab, "id" | "workspaceId">;
  items: readonly CanvasItem[];
  acceptIngestedItems: (items: readonly CanvasItem[]) => void;
}

export const useCanvasIngest = ({
  rootRef,
  viewportRef,
  tab,
  items,
  acceptIngestedItems,
}: UseCanvasIngestOptions) => {
  const lastPointerRef = useRef<CanvasPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const rememberPointer = useCallback(
    (clientPoint: CanvasPoint) => {
      const pane = rootRef.current?.getBoundingClientRect();
      const viewport = viewportRef.current;
      if (!pane || !viewport) return;
      lastPointerRef.current = screenPointToCanvasPoint(
        clientPoint,
        pane,
        viewport,
      );
    },
    [rootRef, viewportRef],
  );

  const createTarget = useCallback(() => {
    const pane = rootRef.current?.getBoundingClientRect();
    const viewport = viewportRef.current;
    if (!pane || !viewport) return null;
    return {
      tabId: tab.id,
      workspaceId: tab.workspaceId,
      anchor: lastPointerRef.current ?? getCanvasViewportCenter(pane, viewport),
      pane: { width: pane.width, height: pane.height },
      viewport,
      nextZIndex:
        Math.max(0, ...items.map((candidate) => candidate.zIndex)) + 1,
    };
  }, [items, rootRef, tab.id, tab.workspaceId, viewportRef]);

  const runIngest = useCallback(
    async (operation: () => Promise<CanvasItem[]>) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);
      try {
        acceptIngestedItems(await operation());
      } catch (ingestError) {
        setError(
          ingestError instanceof Error
            ? ingestError.message
            : "The content could not be added to this Canvas.",
        );
      } finally {
        inFlightRef.current = false;
      }
    },
    [acceptIngestedItems],
  );

  const ingestInputs = useCallback(
    async (inputs: readonly CanvasNormalizedInput[]) => {
      const target = createTarget();
      if (!target || inputs.length === 0) return;
      await runIngest(() => canvasIngestService.ingestInputs(target, inputs));
    },
    [createTarget, runIngest],
  );

  const ingestClipboard = useCallback(
    async (payload: CanvasClipboardPayload) => {
      const target = createTarget();
      if (!target) return;
      await runIngest(() =>
        canvasIngestService.ingestClipboard(target, payload),
      );
    },
    [createTarget, runIngest],
  );

  return {
    error,
    rememberPointer,
    ingestInputs,
    ingestClipboard,
  };
};
