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
      const mousePoint = {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };

      const arrowTipState = arrowTipHandler.detectArrowTipClick(shape, mousePoint);
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
          lineResizeHandler.startLineResize(shape, mousePoint);
          return;
        }
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

      if (
        mouseEventState.mouseDownShape?.isArrowTipClick &&
        !mouseEventState.hasMoved
      ) {
        const { shape, arrowTipMode } = mouseEventState.mouseDownShape;
        if (arrowTipMode) {
          arrowTipHandler.handleArrowTipClick(shape, arrowTipMode);
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
