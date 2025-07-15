import { useState, useCallback } from "react";
import { Shape, Point, ShapeSnapTool } from "../types";
import { detectShape } from "../utils/shapeDetection";

export interface ClickState {
  selectedShapeId: string | undefined;
  editingShape: Shape | null;
}

export interface UseClickHandlerProps {
  shapes: Shape[];
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onAddShape?: (shape: Shape) => void;
}

export const useClickHandler = ({
  shapes: _shapes,
  currentTool,
  currentFontSize = 16,
  onShapeClick,
  onUpdateLabel,
  onAddShape,
}: UseClickHandlerProps) => {
  const [clickState, setClickState] = useState<ClickState>({
    selectedShapeId: undefined,
    editingShape: null,
  });

  const generateId = useCallback(
    (): string => `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    [],
  );

  // Handle shape click
  const handleShapeClick = useCallback(
    (shape: Shape, position: Point) => {
      setClickState((prev) => ({
        ...prev,
        selectedShapeId: shape.id,
        editingShape: null,
      }));

      if (onShapeClick) {
        onShapeClick(shape, position);
      }
    },
    [onShapeClick],
  );

  // Handle label save
  const handleLabelSave = useCallback(
    (shapeId: string, label: string) => {
      if (onUpdateLabel) {
        onUpdateLabel(shapeId, label);
      }

      setClickState((prev) => ({
        ...prev,
        editingShape: null,
      }));
    },
    [onUpdateLabel],
  );

  // Handle label cancel
  const handleLabelCancel = useCallback(() => {
    setClickState((prev) => ({
      ...prev,
      editingShape: null,
    }));
  }, []);

  // Handle canvas double click (add text)
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (currentTool !== "draw") return;

      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;

      const newTextShape: Shape = {
        id: generateId(),
        type: "text",
        x: mouseX,
        y: mouseY,
        text: "Double-click to edit",
        fontSize: currentFontSize,
        style: {
          stroke: "transparent",
          fill: "#000000",
          strokeWidth: 0,
        },
        zIndex: Date.now(),
      } as Shape;

      if (onAddShape) {
        onAddShape(newTextShape);
      }

      // Start editing the new text shape
      setClickState((prev) => ({
        ...prev,
        selectedShapeId: newTextShape.id,
        editingShape: newTextShape,
      }));
    },
    [currentTool, currentFontSize, generateId, onAddShape],
  );

  // Handle shape double click (edit text or start drawing)
  const handleShapeDoubleClick = useCallback((shape: Shape) => {
    if (shape.type === "text") {
      setClickState((prev) => ({
        ...prev,
        selectedShapeId: shape.id,
        editingShape: shape,
      }));
    }
  }, []);

  // Handle drawing mode clicks
  const handleDrawingClick = useCallback(
    (points: Point[]) => {
      if (currentTool !== "draw") return null;

      const detectedShape = detectShape(points);
      if (detectedShape) {
        const strokeColor = "#000000"; // Default stroke color
        const newShape: Shape = {
          ...detectedShape,
          id: generateId(),
          style: {
            stroke: strokeColor,
            fill: "transparent",
            strokeWidth: 2,
          },
          zIndex: Date.now(),
        } as Shape;

        // Add default arrow tip to straight lines only
        if (
          newShape.type === "line" &&
          newShape.points &&
          newShape.points.length === 2
        ) {
          (newShape as any).arrowTipEnd = "simple";
          (newShape as any).arrowTipSize = 10;
        }

        if (onAddShape) {
          onAddShape(newShape);
        }

        return newShape;
      }

      return null;
    },
    [currentTool, generateId, onAddShape],
  );

  return {
    // State
    clickState,

    // Actions
    handleShapeClick,
    handleLabelSave,
    handleLabelCancel,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    handleDrawingClick,

    // Setters
    setSelectedShapeId: useCallback((id: string | undefined) =>
      setClickState((prev) => ({ ...prev, selectedShapeId: id })), []),
    setEditingShape: useCallback((shape: Shape | null) =>
      setClickState((prev) => ({ ...prev, editingShape: shape })), []),

    // Computed values
    selectedShapeId: clickState.selectedShapeId,
    editingShape: clickState.editingShape,
  };
};
