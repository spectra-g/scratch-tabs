import { useCallback, type ClipboardEvent } from "react";
import { CANVAS_CLIPBOARD_MIME } from "../constants";
import type { CanvasInteractionState, CanvasItem } from "../types";
import {
  getCanvasClipboardPlainText,
  parseCanvasClipboard,
  serializeCanvasClipboard,
} from "../utils/canvasClipboard";
import { normalizeCanvasDataTransfer } from "../utils/clipboardClassification";
import {
  isCanvasEditableEvent,
  isCanvasInteractiveControlEvent,
} from "../utils/canvasKeyboard";

interface UseCanvasClipboardOptions {
  workspaceId: string;
  interactionState: CanvasInteractionState;
  getSelectedItems: () => CanvasItem[];
  deleteSelection: () => void;
  ingestInputs: (
    inputs: ReturnType<typeof normalizeCanvasDataTransfer>,
  ) => Promise<void>;
  ingestClipboard: (
    payload: NonNullable<ReturnType<typeof parseCanvasClipboard>>,
  ) => Promise<void>;
}

export const useCanvasClipboard = ({
  workspaceId,
  interactionState,
  getSelectedItems,
  deleteSelection,
  ingestInputs,
  ingestClipboard,
}: UseCanvasClipboardOptions) => {
  const writeSelection = useCallback(
    (event: ClipboardEvent<HTMLDivElement>, cut: boolean) => {
      if (
        interactionState.mode === "editing" ||
        isCanvasEditableEvent(event.nativeEvent) ||
        isCanvasInteractiveControlEvent(event.nativeEvent)
      ) {
        return;
      }
      const selectedItems = getSelectedItems();
      if (selectedItems.length === 0) return;

      event.clipboardData.setData(
        CANVAS_CLIPBOARD_MIME,
        serializeCanvasClipboard(selectedItems, workspaceId),
      );
      event.clipboardData.setData(
        "text/plain",
        getCanvasClipboardPlainText(selectedItems),
      );
      event.preventDefault();
      event.stopPropagation();
      if (cut) deleteSelection();
    },
    [deleteSelection, getSelectedItems, interactionState.mode, workspaceId],
  );

  const handleCopy = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => writeSelection(event, false),
    [writeSelection],
  );

  const handleCut = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => writeSelection(event, true),
    [writeSelection],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (
        interactionState.mode === "editing" ||
        isCanvasEditableEvent(event.nativeEvent) ||
        isCanvasInteractiveControlEvent(event.nativeEvent)
      ) {
        return;
      }

      const serialized = event.clipboardData.getData(CANVAS_CLIPBOARD_MIME);
      const payload = serialized ? parseCanvasClipboard(serialized) : null;
      const inputs = payload
        ? []
        : normalizeCanvasDataTransfer(event.clipboardData);
      if (!payload && inputs.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      if (payload) void ingestClipboard(payload);
      else void ingestInputs(inputs);
    },
    [ingestClipboard, ingestInputs, interactionState.mode],
  );

  return { handleCopy, handleCut, handlePaste };
};
