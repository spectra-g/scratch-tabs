import { useCallback, useMemo } from "react";
import { ShapeSnapData, Point, Shape, ShapeSnapTool, TextShape } from "../types";
import { detectShape } from "../utils/shapeDetection";
import { ShapeRegistry } from "../core/ShapeRegistry";
import {
  CommandManager,
  AddShapeCommand,
  UpdateShapeCommand,
  DeleteShapeCommand,
  DeleteSelectedShapesCommand,
  MoveShapeCommand,
  MoveMultipleShapesCommand,
  AddMultipleShapesCommand,
} from "../core/Commands";
import { SelectionManager } from "../core/SelectionManager";

const generateId = (): string =>
  `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const useShapeSnapEngineV2 = (
  state: ShapeSnapData,
  onChange: (newState: ShapeSnapData) => void,
) => {
  // Initialize core components
  const commandManager = useMemo(() => new CommandManager(), []);
  const selectionManager = useMemo(
    () => new SelectionManager(state, onChange),
    [state, onChange],
  );

  // Helper function to get current state (for commands)
  const getCurrentState = useCallback(() => state, [state]);

  // Add a new shape to the canvas
  const addShape = useCallback(
    (shape: Shape) => {
      const command = new AddShapeCommand(getCurrentState, onChange, shape);
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Update a shape's label
  const updateShapeLabel = useCallback(
    (shapeId: string, label: string) => {
      const currentState = getCurrentState();
      const shape = currentState.shapes.find(s => s.id === shapeId);
      
      // For text shapes, update the 'text' property; for others, update the 'label' property
      const updates = shape?.type === "text" 
        ? { text: label || undefined }
        : { label: label || undefined };
      
      const command = new UpdateShapeCommand(
        getCurrentState,
        onChange,
        shapeId,
        updates,
      );
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Update a shape with new properties
  const updateShape = useCallback(
    (shapeId: string, updates: Partial<Shape>) => {
      const command = new UpdateShapeCommand(
        getCurrentState,
        onChange,
        shapeId,
        updates,
      );
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Delete a shape by ID
  const deleteShape = useCallback(
    (shapeId: string) => {
      const command = new DeleteShapeCommand(
        getCurrentState,
        onChange,
        shapeId,
      );
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Delete selected shapes
  const deleteSelectedShapes = useCallback(() => {
    const selectedIds = selectionManager.getSelectedShapeIds();
    if (selectedIds.length === 0) return;

    const command = new DeleteSelectedShapesCommand(
      getCurrentState,
      onChange,
      selectedIds,
    );
    commandManager.executeCommand(command);
  }, [getCurrentState, onChange, commandManager, selectionManager]);

  // Copy selected shapes to clipboard
  const copySelectedShapes = useCallback(() => {
    return selectionManager.copyToClipboard();
  }, [selectionManager]);

  // Cut selected shapes (copy + delete)
  const cutSelectedShapes = useCallback(() => {
    return selectionManager.cutToClipboard();
  }, [selectionManager]);

  // Paste shapes from clipboard
  const pasteShapes = useCallback(() => {
    if (!state.clipboard || state.clipboard.length === 0) return;

    // Offset pasted shapes slightly to avoid exact overlap
    const offset = 20;
    const pastedShapes = state.clipboard.map((shape) => {
      const newShape = {
        ...shape,
        id: generateId(), // Generate new unique IDs
        zIndex: Date.now(), // Ensure pasted shapes appear on top
      };

      // Apply offset based on shape type
      if (shape.type === "line" || shape.type === "orthogonal-arrow") {
        // Handle line and orthogonal-arrow with points array
        if ((shape as any).points) {
          return {
            ...newShape,
            points: (shape as any).points.map((point: Point) => ({
              x: point.x + offset,
              y: point.y + offset,
            })),
          };
        }
      } else if (
        (shape.type === "straight-arrow" || shape.type === "curved-arrow") &&
        (shape as any).from &&
        (shape as any).to
      ) {
        // Handle straight-arrow and curved-arrow with from/to points
        const updates: any = {
          ...newShape,
          from: {
            x: (shape as any).from.x + offset,
            y: (shape as any).from.y + offset,
          },
          to: {
            x: (shape as any).to.x + offset,
            y: (shape as any).to.y + offset,
          },
        };
        
        // Handle curved-arrow control point
        if (shape.type === "curved-arrow" && (shape as any).control) {
          updates.control = {
            x: (shape as any).control.x + offset,
            y: (shape as any).control.y + offset,
          };
        }
        
        return updates;
      } else {
        // Handle all other shapes with x/y coordinates
        return {
          ...newShape,
          x: (shape as any).x + offset,
          y: (shape as any).y + offset,
        };
      }
    });

    // Use AddMultipleShapesCommand for batch paste
    const command = new AddMultipleShapesCommand(
      getCurrentState,
      onChange,
      pastedShapes,
    );
    commandManager.executeCommand(command);

    // NOTE: Removed immediate selection of pasted shapes to prevent state overwrite issues.
    // The selectionManager.selectShapes() call was causing the shapes state to be overwritten
    // because it used stale state and called onChange() again, which conflicted with the
    // just-completed paste operation. Selection should be handled by the UI layer
    // in a separate render cycle or effect to avoid state conflicts.
  }, [state.clipboard, getCurrentState, onChange, commandManager]);

  // Set selected shapes
  const setSelectedShapes = useCallback(
    (shapeIds: string[]) => {
      selectionManager.selectShapes(shapeIds);
    },
    [selectionManager],
  );

  // Toggle shape selection (for multi-select with Ctrl/Cmd)
  const toggleShapeSelection = useCallback(
    (shapeId: string) => {
      selectionManager.toggleSelection(shapeId);
    },
    [selectionManager],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    selectionManager.clearSelection();
  }, [selectionManager]);

  // Detect and add a shape based on drawn points
  const detectAndAddShape = useCallback(
    (points: Point[]) => {
      if (points.length < 2) return null;

      const detectedGeometry = detectShape(points);
      if (detectedGeometry) {
        const strokeColor =
          getCurrentState().canvas.mode === "dark" ? "#ffffff" : "#000000";
        const newShape: Shape = {
          ...detectedGeometry,
          id: generateId(),
          style: {
            stroke: strokeColor,
            fill: "transparent",
            strokeWidth: 2,
          },
          zIndex: Date.now(),
        } as Shape;

        // Add default arrow tip to all arrow types and straight lines
        if (
          newShape.type === "straight-arrow" ||
          newShape.type === "curved-arrow" ||
          newShape.type === "orthogonal-arrow"
        ) {
          (newShape as any).arrowTipEnd = "simple";
          (newShape as any).arrowTipSize = 10;
        } else if (
          newShape.type === "line" &&
          (newShape as any).points &&
          (newShape as any).points.length === 2
        ) {
          (newShape as any).arrowTipEnd = "simple";
          (newShape as any).arrowTipSize = 10;
        }

        addShape(newShape);
        return newShape;
      }
      return null;
    },
    [addShape, getCurrentState],
  );

  // Set the current drawing tool
  const setTool = useCallback(
    (tool: ShapeSnapTool) => {
      onChange({
        ...state,
        currentTool: tool,
      });
    },
    [state, onChange],
  );

  // Toggle canvas mode and update all shapes' colors
  const toggleCanvasMode = useCallback(() => {
    const newMode = state.canvas.mode === "dark" ? "light" : "dark";
    const newBackground = newMode === "dark" ? "#1e1e1e" : "#ffffff";
    const newStrokeColor = newMode === "dark" ? "#ffffff" : "#000000";

    // Update all shapes with new stroke color
    const updatedShapes = state.shapes.map((shape) => ({
      ...shape,
      style: {
        ...shape.style,
        stroke: newStrokeColor,
      },
    }));

    // Update history with new stroke colors
    const newHistory = state.history.map((historyState) =>
      historyState.map((shape) => ({
        ...shape,
        style: {
          ...shape.style,
          stroke: newStrokeColor,
        },
      })),
    );

    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      canvas: {
        ...state.canvas,
        mode: newMode,
        background: newBackground,
      },
    });
  }, [state, onChange]);

  // Undo the last action
  const undo = useCallback(() => {
    commandManager.undo();
  }, [commandManager]);

  // Redo a previously undone action
  const redo = useCallback(() => {
    commandManager.redo();
  }, [commandManager]);

  // Clear the canvas
  const clearCanvas = useCallback(() => {
    // Delete all shapes
    const allShapeIds = state.shapes.map((shape) => shape.id);
    if (allShapeIds.length > 0) {
      const command = new DeleteSelectedShapesCommand(
        getCurrentState,
        onChange,
        allShapeIds,
      );
      commandManager.executeCommand(command);
    }
  }, [state.shapes, getCurrentState, onChange, commandManager]);

  // Export the canvas to an image
  const exportToImage = useCallback(() => {
    // Use the specific data attribute to find the canvas SVG
    const svgElement = document.querySelector(
      '[data-shapesnap-canvas="true"]',
    ) as SVGSVGElement;

    if (!svgElement) {
      console.error("❌ Canvas SVG element not found for export");
      alert("Could not find the canvas to export. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    const width = svgElement.clientWidth || 800; // fallback width
    const height = svgElement.clientHeight || 600; // fallback height

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("❌ Could not get canvas context");
      return;
    }

    // Set background color based on canvas mode
    const backgroundColor =
      state.canvas.mode === "dark" ? "#1e1e1e" : "#ffffff";
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Serialize the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Convert to PNG and download
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `shapesnap-export-${Date.now()}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("❌ Error during PNG export:", error);
        alert("Error during export. Please try again.");
      }
    };

    img.onerror = (error) => {
      console.error("❌ Error loading SVG for export:", error);
      URL.revokeObjectURL(url);
      alert("Error loading canvas for export. Please try again.");
    };

    img.src = url;
  }, [state.canvas.mode]);

  // Cycle through font sizes
  const cycleFontSize = useCallback(() => {
    const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
    const currentIndex = fontSizes.indexOf(state.currentFontSize || 16);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    const newFontSize = fontSizes[nextIndex];

    // Get current state to ensure we have the latest shape data
    const currentState = getCurrentState();
    
    // Update all text shapes with the new font size in a single state update
    const updatedShapes = currentState.shapes.map((shape) => {
      if (shape.type === "text") {
        return {
          ...shape,
          fontSize: newFontSize,
        } as TextShape;
      }
      return shape;
    });

    // Update both shapes and current font size in one go
    onChange({
      ...currentState,
      shapes: updatedShapes,
      currentFontSize: newFontSize,
    });
  }, [state, getCurrentState, onChange]);

  // Move shape by delta
  const moveShape = useCallback(
    (shapeId: string, delta: Point) => {
      const command = new MoveShapeCommand(
        getCurrentState,
        onChange,
        shapeId,
        delta,
      );
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Move multiple shapes by delta
  const moveMultipleShapes = useCallback(
    (updates: { shapeId: string; delta: Point }[]) => {
      const command = new MoveMultipleShapesCommand(
        getCurrentState,
        onChange,
        updates,
      );
      commandManager.executeCommand(command);
    },
    [getCurrentState, onChange, commandManager],
  );

  // Selection manager methods
  const getSelectedShapes = useCallback(() => {
    return selectionManager.getSelectedShapes();
  }, [selectionManager]);

  const getSelectedShapeIds = useCallback(() => {
    return selectionManager.getSelectedShapeIds();
  }, [selectionManager]);

  const isSelected = useCallback(
    (shapeId: string) => {
      return selectionManager.isSelected(shapeId);
    },
    [selectionManager],
  );

  const selectAll = useCallback(() => {
    selectionManager.selectAll();
  }, [selectionManager]);

  const selectInArea = useCallback(
    (startPoint: Point, endPoint: Point) => {
      selectionManager.selectInArea(startPoint, endPoint);
    },
    [selectionManager],
  );

  const getShapesAtPoint = useCallback(
    (point: Point) => {
      return selectionManager.getShapesAtPoint(point);
    },
    [selectionManager],
  );

  const getTopShapeAtPoint = useCallback(
    (point: Point) => {
      return selectionManager.getTopShapeAtPoint(point);
    },
    [selectionManager],
  );

  const handleShapeClick = useCallback(
    (
      shape: Shape,
      point: Point,
      modifiers: { ctrl: boolean; shift: boolean; alt: boolean },
    ) => {
      selectionManager.handleShapeClick(shape, point, modifiers);
    },
    [selectionManager],
  );

  const handleCanvasClick = useCallback(
    (
      point: Point,
      modifiers: { ctrl: boolean; shift: boolean; alt: boolean },
    ) => {
      selectionManager.handleCanvasClick(point, modifiers);
    },
    [selectionManager],
  );

  return {
    // Shape operations
    addShape,
    updateShapeLabel,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    moveShape,
    moveMultipleShapes,

    // Clipboard operations
    copySelectedShapes,
    cutSelectedShapes,
    pasteShapes,

    // Selection operations
    setSelectedShapes,
    toggleShapeSelection,
    clearSelection,
    getSelectedShapes,
    getSelectedShapeIds,
    isSelected,
    selectAll,
    selectInArea,
    getShapesAtPoint,
    getTopShapeAtPoint,
    handleShapeClick,
    handleCanvasClick,

    // Drawing operations
    detectAndAddShape,
    setTool,

    // Canvas operations
    toggleCanvasMode,
    clearCanvas,
    exportToImage,
    cycleFontSize,

    // History operations
    undo,
    redo,

    // State queries
    get canUndo() {
      return commandManager.canUndo();
    },
    get canRedo() {
      return commandManager.canRedo();
    },

    // Command history
    getCommandHistory: () => commandManager.getCommandHistory(),

    // Shape registry access
    shapeRegistry: ShapeRegistry.getInstance(),
  };
};
