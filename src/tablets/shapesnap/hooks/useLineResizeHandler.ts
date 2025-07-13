import { useState, useCallback } from "react";
import { Shape, Point } from "../types";

export interface LineResizeState {
  lineDragMode: "move" | "resize-start" | "resize-end" | null;
  lineDragPoint: Point | null;
  lineDragShape: Shape | null;
  draggedShape: Shape | null;
}

export interface UseLineResizeHandlerProps {
  gridSnappingEnabled?: boolean;
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
}

export const useLineResizeHandler = ({
  gridSnappingEnabled = false,
  onUpdateShape,
}: UseLineResizeHandlerProps) => {
  const [lineResizeState, setLineResizeState] = useState<LineResizeState>({
    lineDragMode: null,
    lineDragPoint: null,
    lineDragShape: null,
    draggedShape: null,
  });

  const snapToGridValue = useCallback(
    (value: number, grid: number) =>
      gridSnappingEnabled ? Math.round(value / grid) * grid : value,
    [gridSnappingEnabled],
  );

  const detectLineDragMode = useCallback(
    (
      shape: Shape,
      mousePoint: Point,
    ): "move" | "resize-start" | "resize-end" => {
      let startPoint: Point | undefined;
      let endPoint: Point | undefined;

      switch (shape.type) {
        case "line":
        case "orthogonal-arrow":
          if (shape.points.length >= 2) {
            startPoint = shape.points[0];
            endPoint = shape.points[shape.points.length - 1];
          }
          break;
        case "straight-arrow":
        case "curved-arrow":
          startPoint = shape.from;
          endPoint = shape.to;
          break;
        default:
          return "move";
      }

      if (!startPoint || !endPoint) return "move";

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
        return "resize-start";
      } else if (distanceToEnd <= threshold) {
        return "resize-end";
      } else {
        return "move";
      }
    },
    [],
  );

  const startLineResize = useCallback(
    (
      shape: Shape,
      mousePoint: Point,
      forceDragMode?: "move" | "resize-start" | "resize-end",
    ) => {
      const dragMode = forceDragMode || detectLineDragMode(shape, mousePoint);
      let fixedPoint: Point | undefined;

      switch (shape.type) {
        case "line":
        case "orthogonal-arrow":
          if (shape.points.length < 2) return;
          if (dragMode === "resize-start") {
            fixedPoint = shape.points[shape.points.length - 1];
          } else if (dragMode === "resize-end") {
            fixedPoint = shape.points[0];
          }
          break;
        case "straight-arrow":
        case "curved-arrow":
          if (dragMode === "resize-start") {
            fixedPoint = shape.to;
          } else if (dragMode === "resize-end") {
            fixedPoint = shape.from;
          }
          break;
        default:
          return;
      }

      setLineResizeState({
        lineDragMode: dragMode,
        lineDragPoint: fixedPoint || { x: 0, y: 0 },
        lineDragShape: shape,
        draggedShape: null,
      });
    },
    [detectLineDragMode],
  );

  const updateLineResize = useCallback(
    (mousePoint: Point) => {
      if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

      const shape = lineResizeState.lineDragShape;
      const snappedPoint = {
        x: snapToGridValue(mousePoint.x, 20),
        y: snapToGridValue(mousePoint.y, 20),
      };

      let updatedShape = { ...shape };

      switch (shape.type) {
        case "straight-arrow":
        case "curved-arrow": {
          if (lineResizeState.lineDragMode === "resize-start") {
            (updatedShape as any).from = snappedPoint;
          } else if (lineResizeState.lineDragMode === "resize-end") {
            (updatedShape as any).to = snappedPoint;
          }
          break;
        }
        case "line":
        case "orthogonal-arrow": {
          const newPoints = [...shape.points];
          if (lineResizeState.lineDragMode === "resize-start") {
            newPoints[0] = snappedPoint;
          } else if (lineResizeState.lineDragMode === "resize-end") {
            newPoints[newPoints.length - 1] = snappedPoint;
          }
          (updatedShape as any).points = newPoints;
          break;
        }
      }

      setLineResizeState((prev) => ({
        ...prev,
        draggedShape: updatedShape,
      }));
    },
    [lineResizeState, snapToGridValue],
  );

  const endLineResize = useCallback(() => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    if (lineResizeState.draggedShape) {
      const finalShape = lineResizeState.draggedShape;
      let updates: Partial<Shape> = {};

      switch (finalShape.type) {
        case "straight-arrow":
        case "curved-arrow":
          updates = { from: finalShape.from, to: finalShape.to };
          break;
        case "line":
        case "orthogonal-arrow":
          updates = { points: finalShape.points };
          break;
      }
      onUpdateShape(lineResizeState.lineDragShape.id, updates);
    }

    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null,
      draggedShape: null,
    });
  }, [lineResizeState, onUpdateShape]);

  const cancelLineResize = useCallback(() => {
    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null,
      draggedShape: null,
    });
  }, []);

  return {
    lineResizeState,
    detectLineDragMode,
    startLineResize,
    updateLineResize,
    endLineResize,
    cancelLineResize,
    isLineResizing: lineResizeState.lineDragMode !== null,
    lineDragMode: lineResizeState.lineDragMode,
    draggedShape: lineResizeState.draggedShape,
  };
};
