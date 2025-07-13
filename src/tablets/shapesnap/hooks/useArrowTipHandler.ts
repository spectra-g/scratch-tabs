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
  // Detect if click is on an arrow tip
  const detectArrowTipClick = useCallback(
    (shape: Shape, mousePoint: Point): ArrowTipState => {
      if (shape.type !== "line") {
        return { isArrowTipClick: false, arrowTipMode: null };
      }

      const lineShape = shape as Shape & {
        points: Point[];
        arrowTipStart?: ArrowTipStyle;
        arrowTipEnd?: ArrowTipStyle;
      };

      if (!lineShape.points || lineShape.points.length < 2) {
        return { isArrowTipClick: false, arrowTipMode: null };
      }

      const startPoint = lineShape.points[0];
      const endPoint = lineShape.points[lineShape.points.length - 1];
      const lineLength = Math.sqrt(
        Math.pow(endPoint.x - startPoint.x, 2) +
          Math.pow(endPoint.y - startPoint.y, 2),
      );

      // Threshold for arrow tip detection (15px or 10% of line length, whichever is smaller)
      const threshold = Math.min(15, Math.max(5, lineLength * 0.1));

      const distanceToStart = Math.sqrt(
        Math.pow(mousePoint.x - startPoint.x, 2) +
          Math.pow(mousePoint.y - startPoint.y, 2),
      );
      const distanceToEnd = Math.sqrt(
        Math.pow(mousePoint.x - endPoint.x, 2) +
          Math.pow(mousePoint.y - endPoint.y, 2),
      );

      // Check if click is on start arrow tip (allow cycling even if no tip is set)
      if (distanceToStart <= threshold) {
        return { isArrowTipClick: true, arrowTipMode: "resize-start" };
      }

      // Check if click is on end arrow tip (allow cycling even if no tip is set)
      if (distanceToEnd <= threshold) {
        return { isArrowTipClick: true, arrowTipMode: "resize-end" };
      }

      return { isArrowTipClick: false, arrowTipMode: null };
    },
    [],
  );

  // Handle arrow tip click
  const handleArrowTipClick = useCallback(
    (shape: Shape, arrowTipMode: "resize-start" | "resize-end") => {
      if (shape.type !== "line") return;

      const lineShape = shape as Shape & {
        arrowTipStart?: ArrowTipStyle;
        arrowTipEnd?: ArrowTipStyle;
      };

      let updates: Partial<Shape> = {};

      if (arrowTipMode === "resize-start") {
        const newArrowTipStart = cycleArrowTip(lineShape.arrowTipStart);
        updates = { arrowTipStart: newArrowTipStart };
      } else if (arrowTipMode === "resize-end") {
        const newArrowTipEnd = cycleArrowTip(lineShape.arrowTipEnd);
        updates = { arrowTipEnd: newArrowTipEnd };
      }

      if (Object.keys(updates).length > 0) {
        onUpdateShape(shape.id, updates);
      }
    },
    [onUpdateShape],
  );

  return {
    // Actions
    detectArrowTipClick,
    handleArrowTipClick,
  };
};
