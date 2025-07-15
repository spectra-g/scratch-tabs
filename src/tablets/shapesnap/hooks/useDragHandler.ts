import { useState, useCallback, useEffect } from "react";
import { Shape, Point } from "../types";
import { getShapeCenter } from "../utils/geometryUtils";

export interface DragState {
  draggingShapeId: string | null;
  dragOffset: { x: number; y: number } | null;
  draggedShape: Shape | null;
  draggedShapes: Shape[] | null; // For multi-selection drag preview
  hasMoved: boolean;
  justCompletedMultiDrag: boolean; // Flag to prevent premature clearing of draggedShapes
  dragGuides: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null;
}

export interface UseDragHandlerProps {
  shapes: Shape[];
  selectedShapeIds?: string[];
  gridSnappingEnabled?: boolean;
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
  onMoveMultipleShapes: (updates: { shapeId: string; delta: Point }[]) => void;
  onShapeClick?: (shape: Shape, position: Point) => void;
}

export const useDragHandler = ({
  shapes,
  selectedShapeIds = [],
  gridSnappingEnabled = false,
  onUpdateShape,
  onMoveMultipleShapes,
  onShapeClick,
}: UseDragHandlerProps) => {
  const [dragState, setDragState] = useState<DragState>({
    draggingShapeId: null,
    dragOffset: null,
    draggedShape: null,
    draggedShapes: null,
    hasMoved: false,
    justCompletedMultiDrag: false,
    dragGuides: null,
  });
  
  // Clear the multi-drag completion flag after spurious clicks are handled
  useEffect(() => {
    if (dragState.justCompletedMultiDrag) {
      const timer = setTimeout(() => {
        setDragState(prev => ({
          ...prev,
          draggedShapes: null,
          justCompletedMultiDrag: false,
        }));
      }, 150); // Wait long enough for spurious clicks to be blocked (matches Canvas timer)
      
      return () => clearTimeout(timer);
    }
  }, [dragState.justCompletedMultiDrag]);

  // Helper: snap a value to the nearest grid
  const snapToGridValue = useCallback(
    (value: number, grid: number) =>
      gridSnappingEnabled ? Math.round(value / grid) * grid : value,
    [gridSnappingEnabled],
  );

  // Helper: calculate position updates for a shape based on center delta
  const calculateShapeUpdates = useCallback((shape: Shape, dx: number, dy: number): Partial<Shape> => {
    switch (shape.type) {
      case "rectangle":
      case "square": {
        const boxShape = shape as Shape & {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        return {
          x: boxShape.x + dx,
          y: boxShape.y + dy,
        } as Partial<Shape & { x: number; y: number }>;
      }
      case "diamond":
      case "triangle":
      case "circle":
      case "text": {
        const centeredShape = shape as Shape & { x: number; y: number };
        return {
          x: centeredShape.x + dx,
          y: centeredShape.y + dy,
        } as Partial<Shape & { x: number; y: number }>;
      }
      case "straight-arrow": {
        const arrowShape = shape as Shape & { from: Point; to: Point };
        return {
          from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
          to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
        } as Partial<Shape & { from: Point; to: Point }>;
      }
      case "curved-arrow": {
        const arrowShape = shape as Shape & { from: Point; to: Point; control: Point };
        return {
          from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
          to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
          control: { x: arrowShape.control.x + dx, y: arrowShape.control.y + dy },
        } as Partial<Shape & { from: Point; to: Point; control: Point }>;
      }
      case "orthogonal-arrow":
      case "line": {
        const lineShape = shape as Shape & { points: Point[] };
        return {
          points: lineShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        } as Partial<Shape & { points: Point[] }>;
      }
      default:
        return {};
    }
  }, []);

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
      draggedShapes: null,
      hasMoved: false,
      justCompletedMultiDrag: false,
      dragGuides: null,
    });
  }, [selectedShapeIds]);

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

      // Check if this is a multi-selection drag
      const draggedShapeIsSelected = selectedShapeIds.includes(dragState.draggingShapeId);
      const hasMultipleSelected = selectedShapeIds.length > 1;
      const isMultiSelectionDrag = draggedShapeIsSelected && hasMultipleSelected;
      
      // Calculate the updated shape for real-time visual feedback
      let updatedShape = { ...shape };
      let updatedShapes: Shape[] | null = null;
      
      // Calculate movement delta
      const dx = newCenterX - center.x;
      const dy = newCenterY - center.y;
      
      if (isMultiSelectionDrag) {
        // For multi-selection, update all selected shapes
        updatedShapes = selectedShapeIds.map(shapeId => {
          const targetShape = shapes.find(s => s.id === shapeId);
          if (!targetShape) return null;
          
          const updates = calculateShapeUpdates(targetShape, dx, dy);
          return { ...targetShape, ...updates };
        }).filter(Boolean) as Shape[];
        
        // Also update the primary dragged shape
        updatedShape = updatedShapes.find(s => s.id === shape.id) || updatedShape;
      }

      switch (shape.type) {
        case "rectangle":
        case "square": {
          if (!isMultiSelectionDrag) {
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
          }
          break;
        }
        case "diamond":
        case "triangle":
        case "circle":
        case "text": {
          if (!isMultiSelectionDrag) {
            // For these shapes, x and y represent the center
            updatedShape = {
              ...updatedShape,
              x: newCenterX,
              y: newCenterY,
            } as Shape;
          }
          break;
        }
        case "straight-arrow": {
          if (!isMultiSelectionDrag) {
            const arrowShape = shape as Shape & { from: Point; to: Point };
            updatedShape = {
              ...updatedShape,
              from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
              to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
            } as Shape;
          }
          break;
        }
        case "curved-arrow": {
          if (!isMultiSelectionDrag) {
            const arrowShape = shape as Shape & { from: Point; to: Point; control: Point };
            updatedShape = {
              ...updatedShape,
              from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
              to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy },
              control: { x: arrowShape.control.x + dx, y: arrowShape.control.y + dy },
            } as Shape;
          }
          break;
        }
        case "orthogonal-arrow": {
          if (!isMultiSelectionDrag) {
            const arrowShape = shape as Shape & { points: Point[] };
            updatedShape = {
              ...updatedShape,
              points: arrowShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            } as Shape;
          }
          break;
        }
        case "line": {
          if (!isMultiSelectionDrag) {
            // Move all points by the delta
            const lineShape = shape as Shape & { points: Point[] };
            updatedShape = {
              ...updatedShape,
              points: lineShape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            } as Shape;
          }
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
          draggedShapes: updatedShapes,
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
        return { wasClick: false, wasDrag: false };
      }

      const shape = shapes.find((s) => s.id === dragState.draggingShapeId);
      if (!shape) {
        return { wasClick: false };
      }

      // If we haven't moved much, treat as a click
      if (!dragState.hasMoved) {
        // Check if this would be a multi-selection drag - if so, don't trigger click
        const draggedShapeIsSelected = selectedShapeIds.includes(dragState.draggingShapeId);
        const hasMultipleSelected = selectedShapeIds.length > 1;
        const isMultiSelectionDrag = draggedShapeIsSelected && hasMultipleSelected;
        
        if (!isMultiSelectionDrag && onShapeClick) {
          onShapeClick(shape, mousePoint);
        }
        
        setDragState({
          draggingShapeId: null,
          dragOffset: null,
          draggedShape: null,
          draggedShapes: null,
          hasMoved: false,
          justCompletedMultiDrag: false,
          dragGuides: null,
        });
        return { wasClick: !isMultiSelectionDrag, wasDrag: false };
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
        // Check if we should move multiple shapes
        const draggedShapeIsSelected = selectedShapeIds.includes(dragState.draggingShapeId);
        const hasMultipleSelected = selectedShapeIds.length > 1;
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;

        if (draggedShapeIsSelected && hasMultipleSelected) {
          // Move all selected shapes by the same delta - use atomic operation
          
          const updates = selectedShapeIds.map(shapeId => ({
            shapeId,
            delta: { x: dx, y: dy },
          }));
          
          onMoveMultipleShapes(updates);
        } else {
          // Single shape drag
          onUpdateShape(dragState.draggingShapeId, updates);
        }
      }

      // Reset drag state
      setDragState({
        draggingShapeId: null,
        dragOffset: null,
        draggedShape: null,
        draggedShapes: null,
        hasMoved: false,
        justCompletedMultiDrag: false,
        dragGuides: null,
      });

      return { wasClick: false, wasDrag: true };
    },
    [dragState, shapes, selectedShapeIds, snapToGridValue, onUpdateShape, onMoveMultipleShapes, onShapeClick, calculateShapeUpdates],
  );

  // Cancel drag operation
  const cancelDrag = useCallback(() => {
    setDragState({
      draggingShapeId: null,
      dragOffset: null,
      draggedShape: null,
      draggedShapes: null,
      hasMoved: false,
      justCompletedMultiDrag: false,
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
    hasMoved: dragState.hasMoved,
    draggedShape: dragState.draggedShape,
    draggedShapes: dragState.draggedShapes,
    dragGuides: dragState.dragGuides,
  };
};
