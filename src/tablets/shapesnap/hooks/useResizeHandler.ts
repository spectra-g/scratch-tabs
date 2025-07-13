import { useState, useCallback } from "react";
import { Shape, Point } from "../types";
import { getShapeBoundingBox } from "../utils/geometryUtils";

export interface ResizeState {
  resizeMode: "none" | "resize" | null;
  resizeHandle: string | null;
  resizeStartData: {
    shape: Shape;
    startPoint: Point;
    originalBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
    };
  } | null;
}

export interface UseResizeHandlerProps {
  gridSnappingEnabled?: boolean;
  onUpdateShape: (shapeId: string, updates: Partial<Shape>) => void;
}

export const useResizeHandler = ({
  gridSnappingEnabled = false,
  onUpdateShape,
}: UseResizeHandlerProps) => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    resizeMode: null,
    resizeHandle: null,
    resizeStartData: null,
  });

  // Helper: snap a value to the nearest grid
  const snapToGridValue = useCallback(
    (value: number, grid: number) =>
      gridSnappingEnabled ? Math.round(value / grid) * grid : value,
    [gridSnappingEnabled],
  );

  // Detect resize handle for non-line shapes
  const detectResizeHandle = useCallback(
    (shape: Shape, mousePoint: Point): string | null => {
      if (shape.type === "line") return null;

      const bounds = getShapeBoundingBox(shape);
      const handleSize = 12;
      const threshold = handleSize / 2;

      // Check corners first
      const corners = [
        { name: "nw", x: bounds.left, y: bounds.top },
        { name: "ne", x: bounds.right, y: bounds.top },
        { name: "se", x: bounds.right, y: bounds.bottom },
        { name: "sw", x: bounds.left, y: bounds.bottom },
      ];

      for (const corner of corners) {
        if (
          Math.abs(mousePoint.x - corner.x) <= threshold &&
          Math.abs(mousePoint.y - corner.y) <= threshold
        ) {
          return corner.name;
        }
      }

      // Check edges
      const edges = [
        { name: "n", x: (bounds.left + bounds.right) / 2, y: bounds.top },
        { name: "e", x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
        { name: "s", x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
        { name: "w", x: bounds.left, y: (bounds.top + bounds.bottom) / 2 },
      ];

      for (const edge of edges) {
        if (
          Math.abs(mousePoint.x - edge.x) <= threshold &&
          Math.abs(mousePoint.y - edge.y) <= threshold
        ) {
          return edge.name;
        }
      }

      return null;
    },
    [],
  );

  // Calculate new bounds during resize
  const calculateResizeBounds = useCallback(
    (
      originalBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
        radius?: number;
      },
      handle: string,
      deltaX: number,
      deltaY: number,
      shapeType: string,
    ): {
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
    } => {
      const { x, y, width, height, radius } = originalBounds;
      let newX = x;
      let newY = y;
      let newWidth = width;
      let newHeight = height;
      let newRadius = radius;

      // Snap to grid
      const snappedDeltaX = snapToGridValue(deltaX, 20);
      const snappedDeltaY = snapToGridValue(deltaY, 20);

      switch (handle) {
        case "nw":
          newX = x + snappedDeltaX;
          newY = y + snappedDeltaY;
          newWidth = Math.max(20, width - snappedDeltaX);
          newHeight = Math.max(20, height - snappedDeltaY);
          break;
        case "ne":
          newY = y + snappedDeltaY;
          newWidth = Math.max(20, width + snappedDeltaX);
          newHeight = Math.max(20, height - snappedDeltaY);
          break;
        case "se":
          newWidth = Math.max(20, width + snappedDeltaX);
          newHeight = Math.max(20, height + snappedDeltaY);
          break;
        case "sw":
          newX = x + snappedDeltaX;
          newWidth = Math.max(20, width - snappedDeltaX);
          newHeight = Math.max(20, height + snappedDeltaY);
          break;
        case "n":
          newY = y + snappedDeltaY;
          newHeight = Math.max(20, height - snappedDeltaY);
          break;
        case "e":
          newWidth = Math.max(20, width + snappedDeltaX);
          break;
        case "s":
          newHeight = Math.max(20, height + snappedDeltaY);
          break;
        case "w":
          newX = x + snappedDeltaX;
          newWidth = Math.max(20, width - snappedDeltaX);
          break;
      }

      // For circles, maintain aspect ratio and use radius
      if (shapeType === "circle") {
        if (handle === "n" || handle === "s") {
          newRadius = Math.max(10, newHeight / 2);
        } else if (handle === "e" || handle === "w") {
          newRadius = Math.max(10, newWidth / 2);
        } else {
          // Corner handles - use the smaller dimension to maintain aspect ratio
          newRadius = Math.max(10, Math.min(newWidth, newHeight) / 2);
        }
      }

      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        radius: newRadius,
      };
    },
    [snapToGridValue],
  );

  // Start resize operation
  const startResize = useCallback(
    (shape: Shape, mousePoint: Point, handle: string) => {
      // For shapes with center coordinates, we need to calculate the bounding box
      // and then convert back to center-based coordinates for resize calculations
      let originalBounds;

      if (shape.type === "circle") {
        const circle = shape as any;
        originalBounds = {
          x: circle.x - circle.radius,
          y: circle.y - circle.radius,
          width: circle.radius * 2,
          height: circle.radius * 2,
          radius: circle.radius,
        };
      } else {
        // For rectangle, square, diamond, triangle, text - they use center coordinates
        const rectShape = shape as any;
        originalBounds = {
          x: rectShape.x - rectShape.width / 2,
          y: rectShape.y - rectShape.height / 2,
          width: rectShape.width,
          height: rectShape.height,
          radius: undefined,
        };
      }

      setResizeState({
        resizeMode: "resize",
        resizeHandle: handle,
        resizeStartData: {
          shape,
          startPoint: mousePoint,
          originalBounds,
        },
      });
    },
    [],
  );

  // Update resize operation
  const updateResize = useCallback(
    (mousePoint: Point) => {
      if (
        resizeState.resizeMode !== "resize" ||
        !resizeState.resizeHandle ||
        !resizeState.resizeStartData
      ) {
        return;
      }

      const { shape, startPoint, originalBounds } = resizeState.resizeStartData;
      const deltaX = mousePoint.x - startPoint.x;
      const deltaY = mousePoint.y - startPoint.y;

      const newBounds = calculateResizeBounds(
        originalBounds,
        resizeState.resizeHandle,
        deltaX,
        deltaY,
        shape.type,
      );

      // Calculate updates based on shape type
      let updates: Partial<Shape> = {};

      switch (shape.type) {
        case "rectangle":
        case "square":
        case "diamond":
        case "triangle": {
          updates = {
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2,
            width: newBounds.width,
            height: newBounds.height,
          } as Partial<
            Shape & { x: number; y: number; width: number; height: number }
          >;
          break;
        }
        case "circle": {
          updates = {
            x: newBounds.x + newBounds.radius!,
            y: newBounds.y + newBounds.radius!,
            radius: newBounds.radius,
          } as Partial<Shape & { x: number; y: number; radius: number }>;
          break;
        }
        case "text": {
          updates = {
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2,
            fontSize: Math.max(8, Math.min(newBounds.width, newBounds.height)),
          } as Partial<Shape & { x: number; y: number; fontSize: number }>;
          break;
        }
      }

      // Apply updates immediately for real-time feedback
      if (Object.keys(updates).length > 0) {
        onUpdateShape(shape.id, updates);
      }
    },
    [resizeState, calculateResizeBounds, onUpdateShape],
  );

  // End resize operation
  const endResize = useCallback(
    (mousePoint: Point) => {
      if (
        resizeState.resizeMode !== "resize" ||
        !resizeState.resizeHandle ||
        !resizeState.resizeStartData
      ) {
        return;
      }

      // Final update (updateResize already calls onUpdateShape)
      updateResize(mousePoint);

      // Reset resize state
      setResizeState({
        resizeMode: null,
        resizeHandle: null,
        resizeStartData: null,
      });
    },
    [resizeState, updateResize],
  );

  // Cancel resize operation
  const cancelResize = useCallback(() => {
    setResizeState({
      resizeMode: null,
      resizeHandle: null,
      resizeStartData: null,
    });
  }, []);

  return {
    // State
    resizeState,

    // Actions
    detectResizeHandle,
    startResize,
    updateResize,
    endResize,
    cancelResize,

    // Computed values
    isResizing: resizeState.resizeMode === "resize",
    resizeHandle: resizeState.resizeHandle,
  };
};
