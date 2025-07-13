import { useCallback } from "react";
import { Shape, Point, ArrowTipStyle } from "../types";
import { cycleArrowTip } from "../utils/arrowTipUtils";

export interface ArrowTipState {
  isArrowTipClick: boolean;
  arrowTipMode: "resize-start" | "resize-end" | null;
}

export interface UseArrowTipHandlerProps {
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
}

export const useArrowTipHandler = ({
  onUpdateShape,
}: UseArrowTipHandlerProps) => {
  const detectArrowTipClick = useCallback(
    (shape: Shape, mousePoint: Point): ArrowTipState => {
      const isLineLike =
        shape.type === "line" ||
        shape.type === "straight-arrow" ||
        shape.type === "curved-arrow" ||
        shape.type === "orthogonal-arrow";

      if (!isLineLike) {
        return { isArrowTipClick: false, arrowTipMode: null };
      }

      let startPoint: Point | undefined;
      let endPoint: Point | undefined;

      if (shape.type === "line" || shape.type === "orthogonal-arrow") {
        if (shape.points.length >= 2) {
          startPoint = shape.points[0];
          endPoint = shape.points[shape.points.length - 1];
        }
      } else {
        startPoint = shape.from;
        endPoint = shape.to;
      }

      if (!startPoint || !endPoint) {
        return { isArrowTipClick: false, arrowTipMode: null };
      }

      const lineLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2),
      );

      const threshold = Math.min(15, Math.max(5, lineLength * 0.1));

      const distanceToStart = Math.sqrt(
        Math.pow(mousePoint.x - startPoint.x, 2) +
          Math.pow(mousePoint.y - startPoint.y, 2),
      );
      const distanceToEnd = Math.sqrt(
        Math.pow(mousePoint.x - endPoint.x, 2) +
          Math.pow(mousePoint.y - endPoint.y, 2),
      );

      if (distanceToStart <= threshold) {
        return { isArrowTipClick: true, arrowTipMode: "resize-start" };
      }

      if (distanceToEnd <= threshold) {
        return { isArrowTipClick: true, arrowTipMode: "resize-end" };
      }

      return { isArrowTipClick: false, arrowTipMode: null };
    },
    [],
  );

  const handleArrowTipClick = useCallback(
    (shape: Shape, arrowTipMode: "resize-start" | "resize-end") => {
      const isLineLike =
        shape.type === "line" ||
        shape.type === "straight-arrow" ||
        shape.type === "curved-arrow" ||
        shape.type === "orthogonal-arrow";

      if (!isLineLike) return;

      let updates: Partial<Shape> = {};

      if (arrowTipMode === "resize-start") {
        const newArrowTipStart = cycleArrowTip((shape as any).arrowTipStart);
        updates = { arrowTipStart: newArrowTipStart };
      } else if (arrowTipMode === "resize-end") {
        const newArrowTipEnd = cycleArrowTip((shape as any).arrowTipEnd);
        updates = { arrowTipEnd: newArrowTipEnd };
      }

      if (Object.keys(updates).length > 0) {
        onUpdateShape(shape.id, updates);
      }
    },
    [onUpdateShape],
  );

  return {
    detectArrowTipClick,
    handleArrowTipClick,
  };
};
