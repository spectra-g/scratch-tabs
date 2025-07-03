import { useState, useCallback } from 'react';
import { Shape, Point } from '../types';

export interface LineResizeState {
  lineDragMode: 'move' | 'resize-start' | 'resize-end' | null;
  lineDragPoint: Point | null;
  lineDragShape: Shape | null;
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
    lineDragShape: null
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
  const startLineResize = useCallback((shape: Shape, mousePoint: Point) => {
    if (shape.type !== 'line') return;

    const lineShape = shape as Shape & { points: Point[] };
    if (!lineShape.points || lineShape.points.length < 2) return;

    const dragMode = detectLineDragMode(shape, mousePoint);
    
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
      lineDragShape: shape
    });
  }, [detectLineDragMode]);

  // Update line resize operation
  const updateLineResize = useCallback((mousePoint: Point) => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    const shape = lineResizeState.lineDragShape;
    const lineShape = shape as Shape & { points: Point[] };
    
    if (!lineShape.points || lineShape.points.length < 2) return;

    const snappedX = snapToGridValue(mousePoint.x, 20);
    const snappedY = snapToGridValue(mousePoint.y, 20);

    let updates: Partial<Shape> = {};

    switch (lineResizeState.lineDragMode) {
      case 'resize-start': {
        // Resize from start point
        updates = {
          points: [
            { x: snappedX, y: snappedY },
            lineResizeState.lineDragPoint!
          ]
        } as Partial<Shape & { points: Point[] }>;
        break;
      }
      case 'resize-end': {
        // Resize from end point
        updates = {
          points: [
            lineResizeState.lineDragPoint!,
            { x: snappedX, y: snappedY }
          ]
        } as Partial<Shape & { points: Point[] }>;
        break;
      }
      case 'move': {
        // Move entire line
        const center = {
          x: (lineShape.points[0].x + lineShape.points[lineShape.points.length - 1].x) / 2,
          y: (lineShape.points[0].y + lineShape.points[lineShape.points.length - 1].y) / 2
        };
        const newCenterX = snapToGridValue(mousePoint.x, 20);
        const newCenterY = snapToGridValue(mousePoint.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        
        updates = {
          points: lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        } as Partial<Shape & { points: Point[] }>;
        break;
      }
    }

    return updates;
  }, [lineResizeState, snapToGridValue]);

  // End line resize operation
  const endLineResize = useCallback((mousePoint: Point) => {
    if (!lineResizeState.lineDragMode || !lineResizeState.lineDragShape) return;

    const updates = updateLineResize(mousePoint);
    
    if (updates && Object.keys(updates).length > 0) {
      onUpdateShape(lineResizeState.lineDragShape.id, updates);
    }

    // Reset line resize state
    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null
    });
  }, [lineResizeState, updateLineResize, onUpdateShape]);

  // Cancel line resize operation
  const cancelLineResize = useCallback(() => {
    setLineResizeState({
      lineDragMode: null,
      lineDragPoint: null,
      lineDragShape: null
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
    lineDragMode: lineResizeState.lineDragMode
  };
}; 