import { useState, useCallback } from "react";
import { Shape, Point } from "../types";
import { getShapeCenter } from "../utils/geometryUtils";

export interface DragState {
  draggingShapeId: string | null;
  dragOffset: { x: number; y: number } | null;
  draggedShape: Shape | null;
  hasMoved: boolean;
  dragGuides: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null;
}

export interface UseDragHandlerProps {
  shapes: Shape[];
  gridSnappingEnabled?: boolean;
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
  onShapeClick?: (shape: Shape, position: Point) => void;
}

export const useDragHandler = ({
  shapes,
  gridSnappingEnabled = false,
  onUpdateShape,
  onShapeClick,
}: UseDragHandlerProps) => {
  const [dragState, setDragState] = useState<DragState>({
    draggingShapeId: null,
    dragOffset: null,
    draggedShape: null,
    hasMoved: false,
    dragGuides: null,
  });

  // Helper: snap a value to the nearest grid
  const snapToGridValue = useCallback(
    (value: number, grid: number) =>
      gridSnappingEnabled ? Math.round(value / grid) * grid : value,
    [gridSnappingEnabled],
  );

  // Start dragging a shape
  const startDrag = useCallback((shape: Shape, mousePoint: Point) => {
    const center = getShapeCenter(shape);
    const offset = {
      x: mousePoint.x - center.x,
      y: mousePoint.y - center.y,
    };

    setDragState({
      draggingShapeId: shape.id,
      dragOffset: offset,
      draggedShape: shape,
      hasMoved: false,
      dragGuides: null,
    });
  }, []);

  // Update drag position
  const updateDrag = useCallback(
    (mousePoint: Point) => {
      if (!dragState.draggingShapeId || !dragState.dragOffset) {
        return;
      }

      const shape = shapes.find((s) => s.id === dragState.draggingShapeId);
      if (!shape) {
        return;
      }

      // Mark as moved if we've moved more than 5 pixels
      const center = getShapeCenter(shape);
      const distance = Math.sqrt(
        Math.pow(mousePoint.x - center.x, 2) +
          Math.pow(mousePoint.y - center.y, 2),
      );

      if (distance > 5 && !dragState.hasMoved) {
        setDragState((prev) => ({ ...prev, hasMoved: true }));
      }

      // Calculate new position
      const newCenterX = snapToGridValue(
        mousePoint.x - dragState.dragOffset.x,
        20,
      );
      const newCenterY = snapToGridValue(
        mousePoint.y - dragState.dragOffset.y,
        20,
      );

      // Calculate the updated shape for real-time visual feedback
      let updatedShape = { ...shape };

      switch (shape.type) {
        case "rectangle":
        case "square": {
          const boxShape = shape as Shape & {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          updatedShape = {
            ...updatedShape,
            x: newCenterX - boxShape.width / 2,
            y: newCenterY - boxShape.height / 2,
          } as Shape;
          break;
        }
        case "diamond":
        case "triangle":
        case "circle":
        case "text": {
          // For these shapes, x and y represent the center
          updatedShape = {
            ...updatedShape,
            x: newCenterX,
            y: newCenterY,
          } as Shape;
          break;
        }
        case "straight-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          updatedShape = {
            ...updatedShape,
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
          } as Shape;
          break;
        }
        case "curved-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point; control: Point };
          updatedShape = {
            ...updatedShape,
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
            control: { x: arrowShape.control.x + dx, y: arrowShape.control.y + dy },
          } as Shape;
          break;
        }
        case "orthogonal-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { points: Point[] };
          updatedShape = {
            ...updatedShape,
            points: arrowShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } as Shape;
          break;
        }
        case "line": {
          // Move all points by the delta
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          updatedShape = {
            ...updatedShape,
            points: lineShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } as Shape;
          break;
        }
      }

      // Update drag state with the new shape for visual feedback
      setDragState((prev) => {
        // Calculate drag guides based on the actual shape edges
        let dragGuides = null;

        if (updatedShape) {
          switch (updatedShape.type) {
            case "rectangle":
            case "square": {
              const boxShape = updatedShape as Shape & {
                x: number;
                y: number;
                width: number;
                height: number;
              };
              dragGuides = {
                left: boxShape.x,
                right: boxShape.x + boxShape.width,
                top: boxShape.y,
                bottom: boxShape.y + boxShape.height,
              };
              break;
            }
            case "diamond":
            case "triangle": {
              const polyShape = updatedShape as Shape & {
                x: number;
                y: number;
                width: number;
                height: number;
              };
              dragGuides = {
                left: polyShape.x - polyShape.width / 2,
                right: polyShape.x + polyShape.width / 2,
                top: polyShape.y - polyShape.height / 2,
                bottom: polyShape.y + polyShape.height / 2,
              };
              break;
            }
            case "circle": {
              const circleShape = updatedShape as Shape & {
                x: number;
                y: number;
                radius: number;
              };
              dragGuides = {
                left: circleShape.x - circleShape.radius,
                right: circleShape.x + circleShape.radius,
                top: circleShape.y - circleShape.radius,
                bottom: circleShape.y + circleShape.radius,
              };
              break;
            }
            case "text": {
              const textShape = updatedShape as Shape & {
                x: number;
                y: number;
                fontSize: number;
                text: string;
              };
              const textWidth = textShape.text
                ? textShape.text.length * textShape.fontSize * 0.6
                : 100;
              const textHeight = textShape.fontSize;
              dragGuides = {
                left: textShape.x - textWidth / 2,
                right: textShape.x + textWidth / 2,
                top: textShape.y - textHeight / 2,
                bottom: textShape.y + textHeight / 2,
              };
              break;
            }
            case "straight-arrow":
            case "curved-arrow":
            case "orthogonal-arrow":
            case "line": {
              // For lines and arrows, use the bounding box of all points
              const lineShape = updatedShape as Shape & {
                points?: Point[];
                from?: Point;
                to?: Point;
                control?: Point;
              };
              let points: Point[] = [];

              if (lineShape.points) {
                points = lineShape.points;
              } else if (lineShape.from && lineShape.to) {
                points = [lineShape.from, lineShape.to];
                // For curved arrows, include control point
                if (lineShape.control) {
                  points.push(lineShape.control);
                }
              }

              if (points.length > 0) {
                const xCoords = points.map((p) => p.x);
                const yCoords = points.map((p) => p.y);
                dragGuides = {
                  left: Math.min(...xCoords),
                  right: Math.max(...xCoords),
                  top: Math.min(...yCoords),
                  bottom: Math.max(...yCoords),
                };
              }
              break;
            }
          }
        }

        return {
          ...prev,
          draggedShape: updatedShape,
          dragGuides,
        };
      });
    },
    [dragState, shapes, snapToGridValue],
  );

  // End dragging and apply changes
  const endDrag = useCallback(
    (mousePoint: Point) => {
      if (!dragState.draggingShapeId || !dragState.dragOffset) {
        return { wasClick: false };
      }

      const shape = shapes.find((s) => s.id === dragState.draggingShapeId);
      if (!shape) {
        return { wasClick: false };
      }

      // If we haven't moved much, treat as a click
      if (!dragState.hasMoved) {
        if (onShapeClick) {
          onShapeClick(shape, mousePoint);
        }
        setDragState({
          draggingShapeId: null,
          dragOffset: null,
          draggedShape: null,
          hasMoved: false,
          dragGuides: null,
        });
        return { wasClick: true };
      }

      // Apply drag changes
      const center = getShapeCenter(shape);
      const newCenterX = snapToGridValue(
        mousePoint.x - dragState.dragOffset.x,
        20,
      );
      const newCenterY = snapToGridValue(
        mousePoint.y - dragState.dragOffset.y,
        20,
      );

      // Calculate updates based on shape type
      let updates: Partial<Shape> = {};

      switch (shape.type) {
        case "rectangle":
        case "square": {
          const boxShape = shape as Shape & {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          updates = {
            x: newCenterX - boxShape.width / 2,
            y: newCenterY - boxShape.height / 2,
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case "diamond":
        case "triangle":
        case "circle":
        case "text": {
          // For these shapes, x and y represent the center
          updates = {
            x: newCenterX,
            y: newCenterY,
          } as Partial<Shape & { x: number; y: number }>;
          break;
        }
        case "straight-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          updates = {
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
          } as Partial<Shape & { from: Point; to: Point }>;
          break;
        }
        case "curved-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point; control: Point };
          updates = {
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
            control: { x: arrowShape.control.x + dx, y: arrowShape.control.y + dy },
          } as Partial<Shape & { from: Point; to: Point; control: Point }>;
          break;
        }
        case "orthogonal-arrow": {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { points: Point[] };
          updates = {
            points: arrowShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } as Partial<Shape & { points: Point[] }>;
          break;
        }
        case "line": {
          // Move all points by the delta
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          updates = {
            points: lineShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } as Partial<Shape & { points: Point[] }>;
          break;
        }
      }

      // Apply the updates
      if (Object.keys(updates).length > 0) {
        onUpdateShape(dragState.draggingShapeId, updates);
      }

      // Reset drag state
      setDragState({
        draggingShapeId: null,
        dragOffset: null,
        draggedShape: null,
        hasMoved: false,
        dragGuides: null,
      });

      return { wasClick: false };
    },
    [dragState, shapes, snapToGridValue, onUpdateShape, onShapeClick],
  );

  // Cancel drag operation
  const cancelDrag = useCallback(() => {
    setDragState({
      draggingShapeId: null,
      dragOffset: null,
      draggedShape: null,
      hasMoved: false,
      dragGuides: null,
    });
  }, []);

  return {
    // State
    dragState,

    // Actions
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,

    // Computed values
    isDragging: dragState.draggingShapeId !== null,
    draggedShape: dragState.draggedShape,
    dragGuides: dragState.dragGuides,
  };
};
