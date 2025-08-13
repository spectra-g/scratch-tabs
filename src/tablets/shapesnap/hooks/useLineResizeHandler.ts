import { useState, useCallback } from "react";
import { Shape, Point, ArrowTipStyle } from "../types";

export interface LineResizeState {
  lineDragMode: "move" | "resize-start" | "resize-end" | null;
  lineDragPoint: Point | null;
  lineDragShape: Shape | null;
  draggedShape: Shape | null;
}

export interface UseLineResizeHandlerProps {
  gridSnappingEnabled?: boolean;
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
  shapes?: Shape[]; // Array of original shapes with correct styling (not hit area versions)
}

export const useLineResizeHandler = ({
  gridSnappingEnabled = false,
  onUpdateShape,
  shapes = [],
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
      // In sketch mode, mouse events come from invisible hit areas with transparent styling.
      // Find the original shape from the shapes array to preserve correct visual properties.
      const originalShape = shapes.find(s => s.id === shape.id) || shape;

      const dragMode = forceDragMode || detectLineDragMode(originalShape, mousePoint);
      let fixedPoint: Point | undefined;

      switch (originalShape.type) {
        case "line":
        case "orthogonal-arrow":
          const lineShape = originalShape as Shape & { points: Point[] };
          if (!lineShape.points || lineShape.points.length < 2) return;
          if (dragMode === "resize-start") {
            fixedPoint = lineShape.points[lineShape.points.length - 1];
          } else if (dragMode === "resize-end") {
            fixedPoint = lineShape.points[0];
          }
          break;
        case "straight-arrow":
        case "curved-arrow":
          const arrowShape = originalShape as Shape & { from: Point; to: Point };
          if (dragMode === "resize-start") {
            fixedPoint = arrowShape.to;
          } else if (dragMode === "resize-end") {
            fixedPoint = arrowShape.from;
          }
          break;
        default:
          return;
      }

      setLineResizeState({
        lineDragMode: dragMode,
        lineDragPoint: fixedPoint || { x: 0, y: 0 },
        lineDragShape: originalShape, // Use the original shape, not the hit area
        draggedShape: null,
      });
    },
    [detectLineDragMode, shapes],
  );

  const updateLineResize = useCallback(
    (mousePoint: Point) => {
      if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

      const shape = lineResizeState.lineDragShape;
      const snappedX = gridSnappingEnabled ? snapToGridValue(mousePoint.x, 20) : mousePoint.x;
      const snappedY = gridSnappingEnabled ? snapToGridValue(mousePoint.y, 20) : mousePoint.y;

      // Create updated shape for immediate visual feedback, preserving all properties
      const updatedShape = { ...shape };

      if (shape.type === 'line' || shape.type === 'orthogonal-arrow') {
        // Handle point-based shapes (line, orthogonal-arrow)
        const lineShape = shape as Shape & { points: Point[] };
        if (!lineShape.points || lineShape.points.length < 2) return;
        
        switch (lineResizeState.lineDragMode) {
          case 'resize-start': {
            // Only modify the first point, preserve the rest of the path
            const newPoints = [...lineShape.points];
            newPoints[0] = { x: snappedX, y: snappedY };
            (updatedShape as Shape & { points: Point[] }).points = newPoints;
            break;
          }
          case 'resize-end': {
            // Only modify the last point, preserve the rest of the path
            const newPoints = [...lineShape.points];
            newPoints[newPoints.length - 1] = { x: snappedX, y: snappedY };
            (updatedShape as Shape & { points: Point[] }).points = newPoints;
            break;
          }
          case 'move': {
            const center = {
              x: (lineShape.points[0].x + lineShape.points[lineShape.points.length - 1].x) / 2,
              y: (lineShape.points[0].y + lineShape.points[lineShape.points.length - 1].y) / 2
            };
            const dx = snappedX - center.x;
            const dy = snappedY - center.y;
            
            (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
            break;
          }
        }
      } else if (shape.type === 'straight-arrow' || shape.type === 'curved-arrow') {
        // Handle from/to-based shapes (straight-arrow, curved-arrow)
        const arrowShape = shape as Shape & { from: Point; to: Point };
        
        switch (lineResizeState.lineDragMode) {
          case 'resize-start': {
            (updatedShape as Shape & { from: Point; to: Point }).from = { x: snappedX, y: snappedY };
            break;
          }
          case 'resize-end': {
            (updatedShape as Shape & { from: Point; to: Point }).to = { x: snappedX, y: snappedY };
            break;
          }
          case 'move': {
            const center = {
              x: (arrowShape.from.x + arrowShape.to.x) / 2,
              y: (arrowShape.from.y + arrowShape.to.y) / 2
            };
            const dx = snappedX - center.x;
            const dy = snappedY - center.y;
            
            const updatedArrowShape = updatedShape as Shape & { from: Point; to: Point };
            updatedArrowShape.from = { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy };
            updatedArrowShape.to = { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy };
            break;
          }
        }
      }

      setLineResizeState((prev) => ({
        ...prev,
        draggedShape: updatedShape,
      }));
    },
    [lineResizeState, snapToGridValue, gridSnappingEnabled],
  );

  const endLineResize = useCallback(() => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    // If we have a draggedShape, use its final state for the update
    if (lineResizeState.draggedShape) {
      const finalShape = lineResizeState.draggedShape;
      let updates: Partial<Shape> = {};

      if (finalShape.type === 'line' || finalShape.type === 'orthogonal-arrow') {
        const lineShape = finalShape as Shape & { 
          points: Point[]; 
          arrowTipStart?: ArrowTipStyle; 
          arrowTipEnd?: ArrowTipStyle; 
          arrowTipSize?: number;
          cornerRadius?: number;
        };
        
        // Preserve all relevant properties for point-based shapes
        updates = { 
          points: lineShape.points,
          arrowTipStart: lineShape.arrowTipStart,
          arrowTipEnd: lineShape.arrowTipEnd,
          arrowTipSize: lineShape.arrowTipSize,
          ...(finalShape.type === 'orthogonal-arrow' && { cornerRadius: lineShape.cornerRadius })
        };
      } else if (finalShape.type === 'straight-arrow' || finalShape.type === 'curved-arrow') {
        const arrowShape = finalShape as Shape & { from: Point; to: Point };
        updates = { from: arrowShape.from, to: arrowShape.to };
      }

      // Apply the final updates
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
