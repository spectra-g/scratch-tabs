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
  currentTool,
  currentFontSize,
  gridSnappingEnabled,
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
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
    console.log('🔍 [Coordinator] Shape mouse down:', {
      shapeId: shape.id,
      shapeType: shape.type,
      currentTool,
      mousePos: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    });

    const mousePoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };

    // Check for arrow tip click first
    const arrowTipState = arrowTipHandler.detectArrowTipClick(shape, mousePoint);
    
    if (arrowTipState.isArrowTipClick) {
      console.log('🔍 [Coordinator] Arrow tip click detected:', arrowTipState);
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
      console.log('🔍 [Coordinator] Resize handle detected:', resizeHandle);
      resizeHandler.startResize(shape, mousePoint, resizeHandle);
      return;
    }

    // Check for line resize
    if (shape.type === 'line') {
      const lineDragMode = lineResizeHandler.detectLineDragMode(shape, mousePoint);
      if (lineDragMode !== 'move') {
        console.log('🔍 [Coordinator] Line resize detected:', lineDragMode);
        lineResizeHandler.startLineResize(shape, mousePoint);
        return;
      }
    }

    // Default to drag operation
    console.log('🔍 [Coordinator] Starting drag operation');
    dragHandler.startDrag(shape, mousePoint);
    
    setMouseEventState({
      mouseDownShape: {
        shape,
        initialPos: mousePoint,
        center: { x: mousePoint.x, y: mousePoint.y }
      },
      hasMoved: false
    });
  }, [dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler, currentTool]);

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
        console.log('🔍 [Coordinator] Mouse moved, distance:', distance);
        setMouseEventState(prev => ({ ...prev, hasMoved: true }));
        
        // If we're dragging an arrow tip, start line resize
        if (mouseEventState.mouseDownShape?.isArrowTipClick && mouseEventState.mouseDownShape.shape.type === 'line') {
          console.log('🔍 [Coordinator] Starting line resize for arrow tip drag:', mouseEventState.mouseDownShape.arrowTipMode);
          // For arrow tip drags, we need to determine which end to resize based on the arrow tip mode
          const arrowTipMode = mouseEventState.mouseDownShape.arrowTipMode;
          if (arrowTipMode === 'resize-start' || arrowTipMode === 'resize-end') {
            // Start line resize with the appropriate mode
            lineResizeHandler.startLineResize(mouseEventState.mouseDownShape.shape, mousePoint, arrowTipMode);
            return;
          }
        }
      }
    }

    // Handle resize operations
    if (resizeHandler.isResizing) {
      console.log('🔍 [Coordinator] Updating resize:', mousePoint);
      resizeHandler.updateResize(mousePoint);
      return;
    }

    // Handle line resize operations
    if (lineResizeHandler.isLineResizing) {
      console.log('🔍 [Coordinator] Updating line resize:', mousePoint);
      lineResizeHandler.updateLineResize(mousePoint);
      return;
    }

    // Handle drag operations
    if (dragHandler.isDragging) {
      console.log('🔍 [Coordinator] Updating drag:', mousePoint);
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

    console.log('🔍 [Coordinator] Mouse up:', {
      isResizing: resizeHandler.isResizing,
      isLineResizing: lineResizeHandler.isLineResizing,
      isDragging: dragHandler.isDragging,
      hasMoved: mouseEventState.hasMoved
    });

    // Handle resize operations
    if (resizeHandler.isResizing) {
      console.log('🔍 [Coordinator] Ending resize');
      resizeHandler.endResize(mousePoint);
      return;
    }

    // Handle line resize operations
    if (lineResizeHandler.isLineResizing) {
      console.log('🔍 [Coordinator] Ending line resize');
      lineResizeHandler.endLineResize();
      return;
    }

    // Handle drag operations
    if (dragHandler.isDragging) {
      console.log('🔍 [Coordinator] Ending drag');
      const result = dragHandler.endDrag(mousePoint);
      
      // If it was a click (not a drag), handle arrow tip click
      if (result.wasClick && mouseEventState.mouseDownShape?.isArrowTipClick) {
        const { shape, arrowTipMode } = mouseEventState.mouseDownShape;
        if (arrowTipMode) {
          console.log('🔍 [Coordinator] Handling arrow tip click:', arrowTipMode);
          arrowTipHandler.handleArrowTipClick(shape, arrowTipMode);
        }
      }
      return;
    }

    // Handle arrow tip clicks that didn't result in dragging
    if (mouseEventState.mouseDownShape?.isArrowTipClick && !mouseEventState.hasMoved) {
      const { shape, arrowTipMode } = mouseEventState.mouseDownShape;
      if (arrowTipMode) {
        console.log('🔍 [Coordinator] Handling arrow tip click (no drag):', arrowTipMode);
        arrowTipHandler.handleArrowTipClick(shape, arrowTipMode);
      }
    }

    // Reset state
    setMouseEventState({
      mouseDownShape: null,
      hasMoved: false
    });
  }, [mouseEventState, dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler]);

  // Handle shape double click
  const handleShapeDoubleClick = useCallback((shape: Shape) => {
    console.log('🔍 [Coordinator] Shape double click:', {
      shapeId: shape.id,
      shapeType: shape.type,
      currentTool
    });
    
    if (currentTool === 'draw') {
      console.log('🔍 [Coordinator] Starting label edit in draw mode');
      clickHandler.setEditingShape(shape);
    }
  }, [currentTool, clickHandler]);

  // Handle canvas double click
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    console.log('🔍 [Coordinator] Canvas double click');
    clickHandler.handleCanvasDoubleClick(e);
  }, [clickHandler]);

  // Handle label save
  const handleLabelSave = useCallback((shapeId: string, label: string) => {
    console.log('🔍 [Coordinator] Saving label:', { shapeId, label });
    clickHandler.handleLabelSave(shapeId, label);
  }, [clickHandler]);

  // Handle label cancel
  const handleLabelCancel = useCallback(() => {
    console.log('🔍 [Coordinator] Canceling label edit');
    clickHandler.handleLabelCancel();
  }, [clickHandler]);

  return {
    // State
    editingShape: clickHandler.editingShape,
    draggedShape: dragHandler.draggedShape,
    dragGuides: dragHandler.dragGuides,
    resizeHandle: resizeHandler.resizeHandle,
    setEditingShape: clickHandler.setEditingShape,
    
    // Actions
    handleLabelSave,
    handleLabelCancel,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    handleShapeMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // State from handlers
    resizeState: resizeHandler.resizeState,
    dragState: dragHandler.dragState,
    lineResizeState: lineResizeHandler.lineResizeState,
    clickState: clickHandler.clickState,
    mouseEventState,
    selectedShapeId: clickHandler.selectedShapeId,
    setSelectedShapeId: clickHandler.setSelectedShapeId,
    detectResizeHandle: resizeHandler.detectResizeHandle,
    
    // Line resize dragged shape for immediate visual feedback
    lineResizeDraggedShape: lineResizeHandler.draggedShape
  };
}; 