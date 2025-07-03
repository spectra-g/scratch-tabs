import { useState, useCallback } from 'react';
import { Shape, Point } from '../types';

export interface LineResizeState {
  lineDragMode: 'move' | 'resize-start' | 'resize-end' | null;
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
  onUpdateShape
}: UseLineResizeHandlerProps) => {
  const [lineResizeState, setLineResizeState] = useState<LineResizeState>({
    lineDragMode: null,
    lineDragPoint: null,
    lineDragShape: null,
    draggedShape: null
  });

  // Helper: snap a value to the nearest grid
  const snapToGridValue = useCallback((value: number, grid: number) => 
    gridSnappingEnabled ? Math.round(value / grid) * grid : value, 
    [gridSnappingEnabled]
  );

  // Detect line drag mode (move, resize-start, or resize-end)
  const detectLineDragMode = useCallback((shape: Shape, mousePoint: Point): 'move' | 'resize-start' | 'resize-end' => {
    if (shape.type !== 'line') return 'move';
    
    const lineShape = shape as Shape & { points: Point[] };
    if (!lineShape.points || lineShape.points.length < 2) return 'move';
    
    const startPoint = lineShape.points[0];
    const endPoint = lineShape.points[lineShape.points.length - 1];
    const lineLength = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );
    
    // Threshold for endpoint detection (15px or 10% of line length, whichever is smaller)
    const threshold = Math.min(15, Math.max(5, lineLength * 0.1));
    
    const distanceToStart = Math.sqrt(
      Math.pow(mousePoint.x - startPoint.x, 2) + Math.pow(mousePoint.y - startPoint.y, 2)
    );
    const distanceToEnd = Math.sqrt(
      Math.pow(mousePoint.x - endPoint.x, 2) + Math.pow(mousePoint.y - endPoint.y, 2)
    );
    
    if (distanceToStart <= threshold) {
      return 'resize-start';
    } else if (distanceToEnd <= threshold) {
      return 'resize-end';
    } else {
      return 'move';
    }
  }, []);

  // Start line resize operation
  const startLineResize = useCallback((shape: Shape, mousePoint: Point, forceDragMode?: 'move' | 'resize-start' | 'resize-end') => {
    if (shape.type !== 'line') return;

    const lineShape = shape as Shape & { points: Point[] };
    if (!lineShape.points || lineShape.points.length < 2) return;

    const dragMode = forceDragMode || detectLineDragMode(shape, mousePoint);
    
    // Determine which point to keep fixed during resize
    let fixedPoint: Point;
    if (dragMode === 'resize-start') {
      fixedPoint = lineShape.points[lineShape.points.length - 1]; // Keep end point fixed
    } else if (dragMode === 'resize-end') {
      fixedPoint = lineShape.points[0]; // Keep start point fixed
    } else {
      fixedPoint = { x: 0, y: 0 }; // Will be calculated for move mode
    }

    setLineResizeState({
      lineDragMode: dragMode,
      lineDragPoint: fixedPoint,
      lineDragShape: shape,
      draggedShape: null
    });
  }, [detectLineDragMode]);

  // Update line resize operation - only update local state for immediate visual feedback
  const updateLineResize = useCallback((mousePoint: Point) => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    const shape = lineResizeState.lineDragShape;
    const lineShape = shape as Shape & { points: Point[] };
    
    if (!lineShape.points || lineShape.points.length < 2) return;

    const snappedX = gridSnappingEnabled ? snapToGridValue(mousePoint.x, 20) : mousePoint.x;
    const snappedY = gridSnappingEnabled ? snapToGridValue(mousePoint.y, 20) : mousePoint.y;

    // Create updated shape for immediate visual feedback (don't call onUpdateShape yet)
    const updatedShape = { ...shape } as Shape & { points: Point[] };

    switch (lineResizeState.lineDragMode) {
      case 'resize-start': {
        // Resize from start point
        updatedShape.points = [
          { x: snappedX, y: snappedY },
          lineResizeState.lineDragPoint!
        ];
        break;
      }
      case 'resize-end': {
        // Resize from end point
        updatedShape.points = [
          lineResizeState.lineDragPoint!,
          { x: snappedX, y: snappedY }
        ];
        break;
      }
      case 'move': {
        // Move entire line
        const center = {
          x: (lineShape.points[0].x + lineShape.points[lineShape.points.length - 1].x) / 2,
          y: (lineShape.points[0].y + lineShape.points[lineShape.points.length - 1].y) / 2
        };
        const newCenterX = snappedX;
        const newCenterY = snappedY;
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        
        updatedShape.points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        break;
      }
    }

    // Update local state for immediate visual feedback
    setLineResizeState(prev => ({
      ...prev,
      draggedShape: updatedShape
    }));
  }, [lineResizeState, snapToGridValue, gridSnappingEnabled]);

  // End line resize operation - now call onUpdateShape to persist changes
  const endLineResize = useCallback(() => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    // If we have a draggedShape, use its final state for the update
    if (lineResizeState.draggedShape) {
      const finalShape = lineResizeState.draggedShape;
      const lineShape = finalShape as Shape & { points: Point[] };
      
      // Prepare updates from the final dragged shape
      const updates: Partial<Shape> = {
        points: lineShape.points
      } as Partial<Shape & { points: Point[] }>;

      // Apply the final updates
      onUpdateShape(lineResizeState.lineDragShape.id, updates);
    }

    // Reset line resize state
    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null,
      draggedShape: null
    });
  }, [lineResizeState, onUpdateShape]);

  // Cancel line resize operation
  const cancelLineResize = useCallback(() => {
    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null,
      draggedShape: null
    });
  }, []);

  return {
    // State
    lineResizeState,
    
    // Actions
    detectLineDragMode,
    startLineResize,
    updateLineResize,
    endLineResize,
    cancelLineResize,
    
    // Computed values
    isLineResizing: lineResizeState.lineDragMode !== null,
    lineDragMode: lineResizeState.lineDragMode,
    draggedShape: lineResizeState.draggedShape
  };
}; 