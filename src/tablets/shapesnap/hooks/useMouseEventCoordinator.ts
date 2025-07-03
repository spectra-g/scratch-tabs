import { useState, useCallback } from 'react';
import { Shape, Point, ShapeSnapTool } from '../types';
import { useDragHandler } from './useDragHandler';
import { useResizeHandler } from './useResizeHandler';
import { useLineResizeHandler } from './useLineResizeHandler';
import { useArrowTipHandler } from './useArrowTipHandler';
import { useClickHandler } from './useClickHandler';

export interface MouseEventState {
  mouseDownShape: { 
    shape: Shape; 
    initialPos: Point; 
    center: Point; 
    isArrowTipClick?: boolean; 
    arrowTipMode?: 'resize-start' | 'resize-end' 
  } | null;
  hasMoved: boolean;
}

export interface UseMouseEventCoordinatorProps {
  shapes: Shape[];
  canvasSettings: any;
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  gridSnappingEnabled?: boolean;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
}

export const useMouseEventCoordinator = ({
  shapes,
  canvasSettings,
  currentTool,
  currentFontSize,
  gridSnappingEnabled,
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onDeleteShape,
  onAddShape
}: UseMouseEventCoordinatorProps) => {
  const [mouseEventState, setMouseEventState] = useState<MouseEventState>({
    mouseDownShape: null,
    hasMoved: false
  });

  // Initialize all handlers
  const dragHandler = useDragHandler({
    shapes,
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!,
    onShapeClick
  });

  const resizeHandler = useResizeHandler({
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!
  });

  const lineResizeHandler = useLineResizeHandler({
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!
  });

  const arrowTipHandler = useArrowTipHandler({
    onUpdateShape: onUpdateShape!
  });

  const clickHandler = useClickHandler({
    shapes,
    currentTool,
    currentFontSize,
    onShapeClick,
    onUpdateLabel,
    onAddShape
  });

  // Handle shape mouse down
  const handleShapeMouseDown = useCallback((shape: Shape, e: React.MouseEvent) => {
    const mousePoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };

    // Check for arrow tip click first
    const arrowTipState = arrowTipHandler.detectArrowTipClick(shape, mousePoint);
    
    if (arrowTipState.isArrowTipClick) {
      setMouseEventState({
        mouseDownShape: {
          shape,
          initialPos: mousePoint,
          center: { x: mousePoint.x, y: mousePoint.y },
          isArrowTipClick: true,
          arrowTipMode: arrowTipState.arrowTipMode!
        },
        hasMoved: false
      });
      return;
    }

    // Check for resize handle
    const resizeHandle = resizeHandler.detectResizeHandle(shape, mousePoint);
    if (resizeHandle) {
      resizeHandler.startResize(shape, mousePoint, resizeHandle);
      return;
    }

    // Check for line resize
    if (shape.type === 'line') {
      const lineDragMode = lineResizeHandler.detectLineDragMode(shape, mousePoint);
      if (lineDragMode !== 'move') {
        lineResizeHandler.startLineResize(shape, mousePoint);
        return;
      }
    }

    // Default to drag operation
    dragHandler.startDrag(shape, mousePoint);
    
    setMouseEventState({
      mouseDownShape: {
        shape,
        initialPos: mousePoint,
        center: { x: mousePoint.x, y: mousePoint.y }
      },
      hasMoved: false
    });
  }, [dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mousePoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };

    // Update hasMoved state
    if (mouseEventState.mouseDownShape && !mouseEventState.hasMoved) {
      const distance = Math.sqrt(
        Math.pow(mousePoint.x - mouseEventState.mouseDownShape.initialPos.x, 2) +
        Math.pow(mousePoint.y - mouseEventState.mouseDownShape.initialPos.y, 2)
      );
      
      if (distance > 5) {
        setMouseEventState(prev => ({ ...prev, hasMoved: true }));
      }
    }

    // Handle resize operations
    if (resizeHandler.isResizing) {
      resizeHandler.updateResize(mousePoint);
      return;
    }

    // Handle line resize operations
    if (lineResizeHandler.isLineResizing) {
      lineResizeHandler.updateLineResize(mousePoint);
      return;
    }

    // Handle drag operations
    if (dragHandler.isDragging) {
      dragHandler.updateDrag(mousePoint);
      return;
    }
  }, [mouseEventState, dragHandler, resizeHandler, lineResizeHandler]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const mousePoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };

    // Handle resize operations
    if (resizeHandler.isResizing) {
      resizeHandler.endResize(mousePoint);
      return;
    }

    // Handle line resize operations
    if (lineResizeHandler.isLineResizing) {
      lineResizeHandler.endLineResize(mousePoint);
      return;
    }

    // Handle drag operations
    if (dragHandler.isDragging) {
      const result = dragHandler.endDrag(mousePoint);
      
      // If it was a click (not a drag), handle arrow tip click
      if (result.wasClick && mouseEventState.mouseDownShape?.isArrowTipClick) {
        const { shape, arrowTipMode } = mouseEventState.mouseDownShape;
        if (arrowTipMode) {
          arrowTipHandler.handleArrowTipClick(shape, arrowTipMode);
        }
      }
      
      return;
    }

    // Handle regular clicks
    if (mouseEventState.mouseDownShape && !mouseEventState.hasMoved) {
      const { shape } = mouseEventState.mouseDownShape;
      
      // Handle arrow tip click
      if (mouseEventState.mouseDownShape.isArrowTipClick && mouseEventState.mouseDownShape.arrowTipMode) {
        arrowTipHandler.handleArrowTipClick(shape, mouseEventState.mouseDownShape.arrowTipMode);
      } else {
        // Regular shape click
        clickHandler.handleShapeClick(shape, mousePoint);
      }
    }

    // Reset mouse event state
    setMouseEventState({
      mouseDownShape: null,
      hasMoved: false
    });
  }, [mouseEventState, dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler, clickHandler]);

  // Handle canvas double click
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    clickHandler.handleCanvasDoubleClick(e);
  }, [clickHandler]);

  // Handle shape double click
  const handleShapeDoubleClick = useCallback((shape: Shape) => {
    clickHandler.handleShapeDoubleClick(shape);
  }, [clickHandler]);

  return {
    // State from all handlers
    dragState: dragHandler.dragState,
    resizeState: resizeHandler.resizeState,
    lineResizeState: lineResizeHandler.lineResizeState,
    clickState: clickHandler.clickState,
    mouseEventState,
    
    // Computed values
    isDragging: dragHandler.isDragging,
    isResizing: resizeHandler.isResizing,
    isLineResizing: lineResizeHandler.isLineResizing,
    draggedShape: dragHandler.draggedShape,
    dragGuides: dragHandler.dragGuides,
    resizeHandle: resizeHandler.resizeHandle,
    selectedShapeId: clickHandler.selectedShapeId,
    editingShape: clickHandler.editingShape,
    
    // Event handlers
    handleShapeMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    
    // Click handler methods
    handleLabelSave: clickHandler.handleLabelSave,
    handleLabelCancel: clickHandler.handleLabelCancel,
    
    // Setters
    setSelectedShapeId: clickHandler.setSelectedShapeId,
    setEditingShape: clickHandler.setEditingShape
  };
}; 