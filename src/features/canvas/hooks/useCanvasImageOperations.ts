import { useCallback, useMemo } from "react";
import type { Tab } from "../../../types";
import { canvasImageActionService } from "../services/CanvasImageActionService";
import { canvasImageIngestService } from "../services/CanvasImageIngestService";
import type { CanvasImageItem } from "../types";
import type { CanvasPoint } from "../utils/canvasItemFactory";
import type { CanvasImageOperations } from "./useCanvasItems";

export const useCanvasImageOperations = (
  tab: Pick<Tab, "id" | "workspaceId">,
): CanvasImageOperations => {
  const add = useCallback(
    (file: File, position: CanvasPoint, zIndex: number) =>
      canvasImageIngestService.add({
        tabId: tab.id,
        workspaceId: tab.workspaceId,
        file,
        position,
        zIndex,
      }),
    [tab.id, tab.workspaceId],
  );

  const replace = useCallback(
    (item: CanvasImageItem, file: File) =>
      canvasImageIngestService.replace({
        tabId: tab.id,
        workspaceId: tab.workspaceId,
        item,
        file,
      }),
    [tab.id, tab.workspaceId],
  );

  const openInSmartView = useCallback(
    async (assetId: string) => {
      await canvasImageActionService.openInSmartView(tab.id, assetId);
    },
    [tab.id],
  );

  return useMemo(
    () => ({
      add,
      replace,
      copy: (assetId: string) => canvasImageActionService.copy(assetId),
      download: (assetId: string) => canvasImageActionService.download(assetId),
      openInSmartView,
    }),
    [add, openInSmartView, replace],
  );
};
