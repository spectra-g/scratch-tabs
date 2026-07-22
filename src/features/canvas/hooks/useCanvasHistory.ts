import { useCallback, useRef, useState } from "react";
import {
  createCanvasHistory,
  recordCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
  type CanvasHistorySnapshot,
} from "../services/CanvasHistory";

export const useCanvasHistory = () => {
  const historyRef = useRef(createCanvasHistory());
  const [, renderHistoryState] = useState(0);

  const record = useCallback((previous: CanvasHistorySnapshot) => {
    historyRef.current = recordCanvasHistory(historyRef.current, previous);
    renderHistoryState((version) => version + 1);
  }, []);

  const undo = useCallback((current: CanvasHistorySnapshot) => {
    const result = undoCanvasHistory(historyRef.current, current);
    if (!result.snapshot) return null;
    historyRef.current = result.state;
    renderHistoryState((version) => version + 1);
    return result.snapshot;
  }, []);

  const redo = useCallback((current: CanvasHistorySnapshot) => {
    const result = redoCanvasHistory(historyRef.current, current);
    if (!result.snapshot) return null;
    historyRef.current = result.state;
    renderHistoryState((version) => version + 1);
    return result.snapshot;
  }, []);

  return {
    record,
    undo,
    redo,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
  };
};
