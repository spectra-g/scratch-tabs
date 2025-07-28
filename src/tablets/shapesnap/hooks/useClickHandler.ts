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
  canvasMode?: "light" | "dark";
  editingShape: Shape | null;
  setEditingShape: (shape: Shape | null) => void;
  onShapeClick?: (shape: Shape, position: Point, event?: React.MouseEvent) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
}

export const useClickHandler = ({
  shapes: _shapes,
  currentTool,
  currentFontSize = 16,
  canvasMode = "dark",
  editingShape,
  setEditingShape,
  onShapeClick,
  onUpdateLabel,
  onDeleteShape,
  onAddShape,
}: UseClickHandlerProps) => {
  const [clickState, setClickState] = useState<ClickState>({
    selectedShapeId: undefined,
    editingShape: null, // This will be managed externally now
  });

  const generateId = useCallback(
    (): string => `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    [],
  );

  // Handle shape click
  const handleShapeClick = useCallback(
    (shape: Shape, position: Point, event?: React.MouseEvent) => {
      setClickState((prev) => ({
        ...prev,
        selectedShapeId: shape.id,
        editingShape: null,
      }));

      setEditingShape(null);

      if (onShapeClick) {
        onShapeClick(shape, position, event);
      }
    },
    [onShapeClick, setEditingShape],
  );

  // Handle label save
  const handleLabelSave = useCallback(
    (shapeId: string, label: string) => {
      if (onUpdateLabel) {
        onUpdateLabel(shapeId, label);
      }

      setEditingShape(null);
    },
    [onUpdateLabel, setEditingShape],
  );

  // Handle label cancel
  const handleLabelCancel = useCallback(() => {
    // If we're editing a newly created text shape with default content, delete it
    if (editingShape && editingShape.type === "text") {
      const textShape = editingShape as any;
      if (textShape.text === "Enter text" && onDeleteShape) {
        onDeleteShape(editingShape.id);
      }
    }
    
    setEditingShape(null);
  }, [editingShape, onDeleteShape, setEditingShape]);

  // Handle canvas double click (add text)
  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (currentTool !== "draw" && currentTool !== "text" && currentTool !== "select") return;

      // Use getBoundingClientRect for consistent coordinate calculation
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Get the correct text color based on canvas mode
      const textColor = canvasMode === "dark" ? "#ffffff" : "#000000";

      const newTextShape: Shape = {
        id: generateId(),
        type: "text",
        x: mouseX,
        y: mouseY,
        text: "Enter text",
        fontSize: currentFontSize,
        style: {
          stroke: textColor,
          fill: "transparent",
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
      }));
      setEditingShape(newTextShape);
    },
    [currentTool, currentFontSize, canvasMode, generateId, onAddShape, setEditingShape],
  );

  // Handle shape double click (edit text or start drawing)
  const handleShapeDoubleClick = useCallback((shape: Shape) => {
    if (shape.type === "text") {
      setClickState((prev) => ({
        ...prev,
        selectedShapeId: shape.id,
      }));
      setEditingShape(shape);
    }
  }, [setEditingShape]);

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
    setEditingShape,

    // Computed values
    selectedShapeId: clickState.selectedShapeId,
    editingShape,
  };
};
