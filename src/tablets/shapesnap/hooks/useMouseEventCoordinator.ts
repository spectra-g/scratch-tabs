import { useState, useCallback } from "react";
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
  onAddShape,
}: UseMouseEventCoordinatorProps) => {
  const [mouseEventState, setMouseEventState] = useState<MouseEventState>({
    mouseDownShape: null,
    hasMoved: false,
  });

  const dragHandler = useDragHandler({
    shapes,
    gridSnappingEnabled,
    onUpdateShape: onUpdateShape!,
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
    onShapeClick,
    onUpdateLabel,
    onAddShape,
  });

  const handleShapeMouseDown = useCallback(
    (shape: Shape, e: React.MouseEvent) => {
      console.log(`[DEBUG] handleShapeMouseDown called for shape ${shape.id} (${shape.type})`);
      const mousePoint = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };
      console.log(`[DEBUG] Mouse point:`, mousePoint);

      // Check for arrow tip click, but don't handle it yet - let line resize handler take precedence for dragging
      const arrowTipState = arrowTipHandler.detectArrowTipClick(shape, mousePoint);
      console.log(`[DEBUG] Arrow tip state:`, arrowTipState);

      const resizeHandle = resizeHandler.detectResizeHandle(shape, mousePoint);
      console.log(`[DEBUG] Resize handle:`, resizeHandle);
      if (resizeHandle) {
        console.log(`[DEBUG] Starting resize with handle: ${resizeHandle}`);
        resizeHandler.startResize(shape, mousePoint, resizeHandle);
        return;
      }

      const isLineLike =
        shape.type === "line" ||
        shape.type === "straight-arrow" ||
        shape.type === "curved-arrow" ||
        shape.type === "orthogonal-arrow";
      console.log(`[DEBUG] Is line-like: ${isLineLike}`);

      if (isLineLike) {
        const lineDragMode = lineResizeHandler.detectLineDragMode(
          shape,
          mousePoint,
        );
        console.log(`[DEBUG] Line drag mode: ${lineDragMode}`);
        if (lineDragMode !== "move") {
          // Start line resize, but also remember if this is an arrow tip click
          console.log(`[DEBUG] Starting line resize`);
          lineResizeHandler.startLineResize(shape, mousePoint);
          
          // If this is also an arrow tip click, store that information for later
          if (arrowTipState.isArrowTipClick) {
            console.log(`[DEBUG] Setting arrow tip click state for ${arrowTipState.arrowTipMode}`);
            setMouseEventState({
              mouseDownShape: {
                shape,
                initialPos: mousePoint,
                center: mousePoint,
                isArrowTipClick: true,
                arrowTipMode: arrowTipState.arrowTipMode!,
              },
              hasMoved: false,
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
        });
        return;
      }

      dragHandler.startDrag(shape, mousePoint);
    },
    [dragHandler, resizeHandler, lineResizeHandler, arrowTipHandler],
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
        dragHandler.endDrag(mousePoint);
      }

      setMouseEventState({
        mouseDownShape: null,
        hasMoved: false,
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
    editingShape: clickHandler.editingShape,
    draggedShape: dragHandler.draggedShape,
    dragGuides: dragHandler.dragGuides,
    resizeHandle: resizeHandler.resizeHandle,
    setEditingShape: clickHandler.setEditingShape,
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
