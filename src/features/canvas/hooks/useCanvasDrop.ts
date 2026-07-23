import { useCallback, type DragEvent, type PointerEvent } from "react";
import { normalizeCanvasDataTransfer } from "../utils/clipboardClassification";
import { isCanvasEditableEvent } from "../utils/canvasKeyboard";

interface UseCanvasDropOptions {
  rememberPointer: (point: { x: number; y: number }) => void;
  ingestInputs: (
    inputs: ReturnType<typeof normalizeCanvasDataTransfer>,
  ) => Promise<void>;
}

export const useCanvasDrop = ({
  rememberPointer,
  ingestInputs,
}: UseCanvasDropOptions) => {
  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      rememberPointer({ x: event.clientX, y: event.clientY });
    },
    [rememberPointer],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (isCanvasEditableEvent(event.nativeEvent)) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isCanvasEditableEvent(event.nativeEvent)) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      rememberPointer({ x: event.clientX, y: event.clientY });
      const inputs = normalizeCanvasDataTransfer(event.dataTransfer);
      if (inputs.length > 0) void ingestInputs(inputs);
    },
    [ingestInputs, rememberPointer],
  );

  return { handlePointerMove, handleDragOver, handleDrop };
};
