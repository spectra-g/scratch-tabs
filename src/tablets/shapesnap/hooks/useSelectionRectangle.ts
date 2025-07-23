import { useState, useCallback } from "react";
import { Point, Shape } from "../types";
import { getShapeBoundingBox } from "../utils/geometryUtils";

export interface SelectionRectangle {
  startPoint: Point;
  endPoint: Point;
  isActive: boolean;
  justCompleted: boolean;
}

export interface UseSelectionRectangleProps {
  shapes: Shape[];
  onSelectionChange: (shapeIds: string[]) => void;
  isSelectMode: boolean;
}

export const useSelectionRectangle = ({
  shapes,
  onSelectionChange,
  isSelectMode,
}: UseSelectionRectangleProps) => {
  const [selectionRectangle, setSelectionRectangle] = useState<SelectionRectangle>({
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 0, y: 0 },
    isActive: false,
    justCompleted: false,
  });

  const startSelection = useCallback((point: Point) => {
    if (!isSelectMode) return;
    
    setSelectionRectangle({
      startPoint: point,
      endPoint: point,
      isActive: true,
      justCompleted: false,
    });
  }, [isSelectMode]);

  const updateSelection = useCallback((point: Point) => {
    if (!selectionRectangle.isActive) return;
    
    setSelectionRectangle(prev => ({
      ...prev,
      endPoint: point,
    }));
  }, [selectionRectangle.isActive]);

  const endSelection = useCallback(() => {
    if (!selectionRectangle.isActive) return;
    
    const bounds = getNormalizedBounds(selectionRectangle.startPoint, selectionRectangle.endPoint);
    const intersectingShapes = getShapesIntersectingRectangle(shapes, bounds);
    
    onSelectionChange(intersectingShapes.map(shape => shape.id));
    
    setSelectionRectangle(prev => ({
      ...prev,
      isActive: false,
      justCompleted: true,
    }));
    
    // Clear the justCompleted flag after a short delay
    setTimeout(() => {
      setSelectionRectangle(prev => ({
        ...prev,
        justCompleted: false,
      }));
    }, 100);
  }, [selectionRectangle, shapes, onSelectionChange]);

  const cancelSelection = useCallback(() => {
    setSelectionRectangle(prev => ({
      ...prev,
      isActive: false,
      justCompleted: false,
    }));
  }, []);

  return {
    selectionRectangle,
    startSelection,
    updateSelection,
    endSelection,
    cancelSelection,
  };
};

// Helper function to normalize rectangle bounds
const getNormalizedBounds = (startPoint: Point, endPoint: Point) => {
  return {
    left: Math.min(startPoint.x, endPoint.x),
    right: Math.max(startPoint.x, endPoint.x),
    top: Math.min(startPoint.y, endPoint.y),
    bottom: Math.max(startPoint.y, endPoint.y),
  };
};

// Helper function to detect shapes intersecting with rectangle
const getShapesIntersectingRectangle = (shapes: Shape[], bounds: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}): Shape[] => {
  return shapes.filter(shape => {
    const shapeBounds = getShapeBoundingBox(shape);
    
    // Check if rectangles intersect (not just contained within)
    return !(
      shapeBounds.right < bounds.left ||
      shapeBounds.left > bounds.right ||
      shapeBounds.bottom < bounds.top ||
      shapeBounds.top > bounds.bottom
    );
  });
};