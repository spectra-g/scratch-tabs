import { useState, useCallback, useEffect } from "react";
import { Shape, Point, ShapeSnapTool } from "../types";
import { useDragHandler } from "./useDragHandler";
import { useResizeHandler } from "./useResizeHandler";
import { useLineResizeHandler } from "./useLineResizeHandler";
import { useArrowTipHandler } from "./useArrowTipHandler";
import { useClickHandler } from "./useClickHandler";

export interface MouseEventState {
  mouseDownShape: {
    shape: Shape;
    initialPos: Point;
    center: Point;
    isArrowTipClick?: boolean;
    arrowTipMode?: "resize-start" | "resize-end";
  } | null;
  hasMoved: boolean;
  justCompletedDrag: boolean;
}

export interface UseMouseEventCoordinatorProps {
  shapes: Shape[];
  canvasSettings: any;
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  selectedShapeIds?: string[];
  gridSnappingEnabled?: boolean;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onMoveMultipleShapes?: (updates: { shapeId: string; delta: Point }[]) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
}

export const useMouseEventCoordinator = ({
  shapes,
  canvasSettings,
  currentTool,
  currentFontSize,
  selectedShapeIds = [],
  gridSnappingEnabled,
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onMoveMultipleShapes,
  onAddShape,
}: UseMouseEventCoordinatorProps) => {
  const [mouseEventState, setMouseEventState] = useState<MouseEventState>({
    mouseDownShape: null,
    hasMoved: false,
    justCompletedDrag: false,
  });
  
  // Clear the justCompletedDrag flag after a short delay
  useEffect(() => {
    if (mouseEventState.justCompletedDrag) {
      const timer = setTimeout(() => {
        setMouseEventState(prev => ({ ...prev, justCompletedDrag: false }));
      }, 50); // Very short delay to prevent immediate click processing
      
      return () => clearTimeout(timer);
    }
  }, [mouseEventState.justCompletedDrag]);

  // Manage editing state at this level to persist across re-renders
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  

  const dragHandler = useDragHandler({
    shapes,
    selectedShapeIds,
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!,
    onMoveMultipleShapes: onMoveMultipleShapes!,
    onShapeClick,
  });

  const resizeHandler = useResizeHandler({
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!,
  });

  const lineResizeHandler = useLineResizeHandler({
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!,
  });

  const arrowTipHandler = useArrowTipHandler({
    onUpdateShape: onUpdateShape!,
  });

  const clickHandler = useClickHandler({
    shapes,
    currentTool,
    currentFontSize,
    canvasMode: canvasSettings?.mode || "dark",
    editingShape,
    setEditingShape,
    onShapeClick,
    onUpdateLabel,
    onAddShape,
  });

  const handleShapeMouseDown = useCallback(
    (shape: Shape, e: React.MouseEvent) => {
      const mousePoint = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };

      // Check for arrow tip click, but don't handle it yet - let line resize handler take precedence for dragging
      const arrowTipState = arrowTipHandler.detectArrowTipClick(shape, mousePoint);

      const resizeHandle = resizeHandler.detectResizeHandle(shape, mousePoint);
      if (resizeHandle) {
        resizeHandler.startResize(shape, mousePoint, resizeHandle);
        return;
      }

      const isLineLike =
        shape.type === "line" ||
        shape.type === "straight-arrow" ||
        shape.type === "curved-arrow" ||
        shape.type === "orthogonal-arrow";

      if (isLineLike) {
        const lineDragMode = lineResizeHandler.detectLineDragMode(
          shape,
          mousePoint,
        );
        if (lineDragMode !== "move") {
          // Start line resize, but also remember if this is an arrow tip click
          lineResizeHandler.startLineResize(shape, mousePoint);
          
          // If this is also an arrow tip click, store that information for later
          if (arrowTipState.isArrowTipClick) {
            setMouseEventState({
              mouseDownShape: {
                shape,
                initialPos: mousePoint,
                center: mousePoint,
                isArrowTipClick: true,
                arrowTipMode: arrowTipState.arrowTipMode!,
              },
              hasMoved: false,
              justCompletedDrag: false,
            });
          }
          return;
        }
      }

      // If we reach here for a line-like shape and it's an arrow tip click, handle it
      if (arrowTipState.isArrowTipClick) {
        setMouseEventState({
          mouseDownShape: {
            shape,
            initialPos: mousePoint,
            center: mousePoint,
            isArrowTipClick: true,
            arrowTipMode: arrowTipState.arrowTipMode!,
          },
          hasMoved: false,
          justCompletedDrag: false,
        });
        return;
      }

      dragHandler.startDrag(shape, mousePoint);
    },
    [dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler, selectedShapeIds],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const mousePoint = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };

      if (mouseEventState.mouseDownShape && !mouseEventState.hasMoved) {
        const distance = Math.sqrt(
          Math.pow(
            mousePoint.x - mouseEventState.mouseDownShape.initialPos.x,
            2,
          ) +
            Math.pow(
              mousePoint.y - mouseEventState.mouseDownShape.initialPos.y,
              2,
            ),
        );

        if (distance > 5) {
          setMouseEventState((prev) => ({ ...prev, hasMoved: true }));
        }
      }

      if (resizeHandler.isResizing) {
        resizeHandler.updateResize(mousePoint);
      } else if (lineResizeHandler.isLineResizing) {
        lineResizeHandler.updateLineResize(mousePoint);
      } else if (dragHandler.isDragging) {
        dragHandler.updateDrag(mousePoint);
      }
    },
    [mouseEventState, dragHandler, resizeHandler, lineResizeHandler],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const mousePoint = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };

      // Handle arrow tip clicking (but only if user didn't move much)
      if (
        mouseEventState.mouseDownShape?.isArrowTipClick &&
        !mouseEventState.hasMoved
      ) {
        const { shape, arrowTipMode } = mouseEventState.mouseDownShape;
        if (arrowTipMode) {
          arrowTipHandler.handleArrowTipClick(shape, arrowTipMode);
        }
        // Also end line resize if it was active
        if (lineResizeHandler.isLineResizing) {
          lineResizeHandler.cancelLineResize();
        }
      } else if (resizeHandler.isResizing) {
        resizeHandler.endResize(mousePoint);
      } else if (lineResizeHandler.isLineResizing) {
        lineResizeHandler.endLineResize();
      } else if (dragHandler.isDragging) {
        const dragResult = dragHandler.endDrag(mousePoint);
        setMouseEventState({
          mouseDownShape: null,
          hasMoved: false,
          justCompletedDrag: dragResult.wasDrag || false,
        });
        return;
      }

      setMouseEventState({
        mouseDownShape: null,
        hasMoved: false,
        justCompletedDrag: false,
      });
    },
    [
      mouseEventState,
      dragHandler,
      resizeHandler,
      lineResizeHandler,
      arrowTipHandler,
    ],
  );

  const handleShapeDoubleClick = useCallback(
    (shape: Shape) => {
      if (currentTool === "draw") {
        clickHandler.setEditingShape(shape);
      }
    },
    [currentTool, clickHandler],
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      clickHandler.handleCanvasDoubleClick(e);
    },
    [clickHandler],
  );

  const handleLabelSave = useCallback(
    (shapeId: string, label: string) => {
      clickHandler.handleLabelSave(shapeId, label);
    },
    [clickHandler],
  );

  const handleLabelCancel = useCallback(() => {
    clickHandler.handleLabelCancel();
  }, [clickHandler]);

  return {
    editingShape,
    draggedShape: dragHandler.draggedShape,
    draggedShapes: dragHandler.draggedShapes,
    dragHasMoved: dragHandler.hasMoved,
    dragGuides: dragHandler.dragGuides,
    resizeHandle: resizeHandler.resizeHandle,
    justCompletedDrag: mouseEventState.justCompletedDrag,
    setEditingShape,
    handleLabelSave,
    handleLabelCancel,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    handleShapeMouseDown,
    handleMouseMove,
    handleMouseUp,
    detectResizeHandle: resizeHandler.detectResizeHandle,
    lineResizeDraggedShape: lineResizeHandler.draggedShape,
  };
};
