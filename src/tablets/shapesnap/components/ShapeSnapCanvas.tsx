import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { CanvasSettings, Shape, Point, ShapeSnapTool } from "../types";
import {
  renderShape,
  renderRoughShapeSVG,
  renderShapeOverlay,
  hashCode,
} from "../utils/renderUtils";
import { getShapeCenter, getShapeBoundingBox } from "../utils/geometryUtils";
import { useMouseEventCoordinator } from "../hooks/useMouseEventCoordinator";
import { useSelectionRectangle } from "../hooks/useSelectionRectangle";
import { ShapeLabelEditor } from "./ShapeLabelEditor";
import { ShapeSnapInfoModal } from "./ShapeSnapInfoModal";
import { SelectionRectangle } from "./SelectionRectangle";

// Custom hook to create modal-aware event handlers
const useModalAwareHandlers = (isModalOpen: boolean) => {
  const createEventHandler = <T extends Event>(handler: (e: T) => void) => {
    return isModalOpen ? () => {} : handler;
  };

  return { createEventHandler };
};

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
  currentTool: ShapeSnapTool;
  currentFontSize?: number;
  selectedShapeIds?: string[];
  onShapeClick?: (shape: Shape, position: Point, event?: React.MouseEvent) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onMoveMultipleShapes?: (updates: { shapeId: string; delta: Point }[]) => void;
  onDeleteShape?: (shapeId: string) => void;
  onAddShape?: (shape: Shape) => void;
  onDrawEnd?: (points: Point[]) => Shape | null;
  onSelectionChange?: (shapeIds: string[]) => void;
  onToggleShapeSelection?: (shapeId: string) => void;
  onClearSelection?: () => void;
  gridSnappingEnabled?: boolean;
  sketchModeEnabled?: boolean;
  backgroundMode?: "notepad" | "none" | "dot-grid" | "graph-paper" | "isometric";
  showInfoModal: boolean;
  onShowInfoModal: (show: boolean) => void;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height,
  currentTool,
  currentFontSize,
  selectedShapeIds = [],
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onMoveMultipleShapes,
  onDeleteShape,
  onAddShape,
  onSelectionChange,
  onToggleShapeSelection,
  onClearSelection,
  gridSnappingEnabled,
  sketchModeEnabled,
  backgroundMode = "notepad",
  showInfoModal,
  onShowInfoModal,
}) => {
  const { createEventHandler } = useModalAwareHandlers(showInfoModal);

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragCompletionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseInteractionActiveRef = useRef<boolean>(false);

  // Track modifier key states
  const [modifierKeys, setModifierKeys] = useState({
    ctrlKey: false,
    metaKey: false,
  });

  // Handle modifier key tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifierKeys((prev) => ({
        ...prev,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifierKeys((prev) => ({
        ...prev,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      }));
    };

    const handleMouseDown = (e: MouseEvent) => {
      setModifierKeys((prev) => ({
        ...prev,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
      }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Use the new event coordinator hook
  const {
    editingShape,
    draggedShape,
    draggedShapes,
    dragHasMoved,
    dragGuides,
    resizeHandle,
    justCompletedDrag,
    setEditingShape,
    handleLabelSave,
    handleLabelCancel,
    handleCanvasDoubleClick,
    handleShapeDoubleClick,
    handleShapeMouseDown,
    handleMouseMove,
    handleMouseUp,
    detectResizeHandle,
    lineResizeDraggedShape,
  } = useMouseEventCoordinator({
    shapes,
    canvasSettings,
    currentTool,
    currentFontSize,
    selectedShapeIds,
    gridSnappingEnabled,
    onShapeClick,
    onUpdateLabel,
    onUpdateShape,
    onMoveMultipleShapes,
    onDeleteShape,
    onAddShape,
  });

  // Use selection rectangle hook for multi-select
  const {
    selectionRectangle,
    startSelection,
    updateSelection,
    endSelection,
  } = useSelectionRectangle({
    shapes,
    onSelectionChange: onSelectionChange || (() => {}),
    isSelectMode: currentTool === "select",
  });

  // Clear editing state when switching away from compatible modes
  // Allow text editing in draw, text, and select modes only
  useLayoutEffect(() => {
    const isCompatibleTool = currentTool === "draw" || currentTool === "text" || currentTool === "select";
    if (!isCompatibleTool && editingShape) {
      setEditingShape(null);
    }
  }, [currentTool, editingShape, setEditingShape]);

  // Wrapper functions to control when the hook's mouse events should be handled
  const handleWrappedMouseDown = (shape: Shape, e: React.MouseEvent) => {
    // Mark that a mouse interaction is starting
    mouseInteractionActiveRef.current = true;
    
    // Always allow the hook to handle mouse down for dragging and resizing
    // The key is that we prevent the hook's onShapeClick callback, not the mouse tracking
    handleShapeMouseDown(shape, e);
  };

  const handleWrappedMouseMove = (e: React.MouseEvent) => {
    // Handle selection rectangle update
    if (selectionRectangle.isActive) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        updateSelection(point);
      }
    }
    
    // Always allow mouse move
    handleMouseMove(e);
  };

  const handleWrappedMouseUp = (e: React.MouseEvent) => {
    // Handle selection rectangle end
    if (selectionRectangle.isActive) {
      endSelection();
    }
    
    // Always allow the hook to handle mouseUp for proper state cleanup
    // We already disabled the hook's onShapeClick callback (passed undefined),
    // so the hook's internal click detection won't trigger label editing
    const result = handleMouseUp(e);
    
    // Don't clear mouse interaction flag immediately - let the drag blocking handle it
    // If there's an active drag, the drag blocking will clear both flags together
    // If there's no drag, clear after a short delay
    const wasRealDrag = !!(draggedShapes && dragHasMoved);
    if (!wasRealDrag) {
      setTimeout(() => {
        if (!isDraggingRef.current) { // Only clear if drag blocking isn't active
          mouseInteractionActiveRef.current = false;
        }
      }, 50);
    }
    // If there was a real drag, the drag blocking useEffect will clear both flags
    
    return result;
  };

  // Custom shape click handler that properly handles multi-selection
  const handleCustomShapeClick = (shape: Shape, position: Point, event?: React.MouseEvent) => {
    // Call the original onShapeClick if provided
    if (onShapeClick) {
      onShapeClick(shape, position, event);
    }

    // Handle different tools
    switch (currentTool) {
      case "select":
      case "draw":
        // Both select and draw modes should allow shape selection and show resize handles
        // Handle multi-selection with real-time modifier keys from the event
        const isMultiSelect = event ? (event.ctrlKey || event.metaKey) : (modifierKeys.ctrlKey || modifierKeys.metaKey);

        if (isMultiSelect && onToggleShapeSelection) {
          // Multi-selection: toggle this shape in the selection
          onToggleShapeSelection(shape.id);
        } else if (onSelectionChange) {
          // Single selection: select only this shape
          onSelectionChange([shape.id]);
        }
        break;

      case "eraser":
        // Delete the shape when in eraser mode
        if (onDeleteShape) {
          onDeleteShape(shape.id);
        }
        // Clear selection after deleting
        if (onClearSelection) {
          onClearSelection();
        }
        break;

      default:
        // For other tools, clear selection
        if (onClearSelection) {
          onClearSelection();
        }
        break;
    }
  };

  // Custom double-click handler that opens label editor in both draw and select modes
  const handleCustomShapeDoubleClick = (shape: Shape) => {
    // Allow label editing in both draw and select modes
    handleShapeDoubleClick(shape);
  };

  // Handle canvas mouse down to start selection rectangle
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only handle if we're in select mode and clicking on empty canvas
    if (currentTool !== "select" || e.target !== e.currentTarget) {
      return;
    }

    // Block if any mouse interaction is active
    if (mouseInteractionActiveRef.current || isDraggingRef.current) {
      return;
    }

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    startSelection(point);
  };

  // Handle canvas click to clear selection
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Block canvas clicks during any mouse interaction sequence
    if (mouseInteractionActiveRef.current) {
      return;
    }
    
    // Use ref-based blocking which persists across event cycles
    if (isDraggingRef.current) {
      return;
    }
    
    // Prevent clearing selection immediately after a drag operation (backup)
    if (justCompletedDrag) {
      return;
    }
    
    // Be very conservative - block canvas clicks if ANY drag state exists
    // This includes initial mouse down before movement occurs
    if (draggedShape || draggedShapes || lineResizeDraggedShape) {
      return;
    }

    // Don't clear selection if we just completed a selection rectangle
    if (selectionRectangle.isActive || selectionRectangle.justCompleted) {
      return;
    }
    
    // Only clear selection if clicking on empty space (not on a shape)
    if (e.target === e.currentTarget && onClearSelection) {
      onClearSelection();
    }
  };

  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);

  // If we're dragging a shape, replace it with the dragged version for visual feedback
  // Handle both regular drag and line resize drag
  const shapesToRender = (() => {
    let shapes = sortedShapes;

    // Replace with multi-selection dragged shapes if available
    if (draggedShapes && draggedShapes.length > 0) {
      const draggedShapeIds = new Set(draggedShapes.map(s => s.id));
      shapes = shapes.map((shape) => {
        if (draggedShapeIds.has(shape.id)) {
          const draggedVersion = draggedShapes.find(s => s.id === shape.id);
          return draggedVersion || shape;
        }
        return shape;
      });
    } else if (draggedShape) {
      // Replace with single dragged shape if available
      shapes = shapes.map((shape) =>
        shape.id === draggedShape.id ? draggedShape : shape,
      );
    }

    // Replace with line resize dragged shape if available
    if (lineResizeDraggedShape) {
      shapes = shapes.map((shape) =>
        shape.id === lineResizeDraggedShape.id ? lineResizeDraggedShape : shape,
      );
    }

    return shapes;
  })();

  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === "dark" ? "#ffffff" : "#000000";

  // Grid pattern generators
  const getGridColors = () => ({
    gridColor: canvasSettings.mode === "dark" 
      ? "rgba(255, 255, 255, 0.1)" 
      : "rgba(156, 163, 175, 0.15)",
    dotColor: canvasSettings.mode === "dark" 
      ? "rgba(255, 255, 255, 0.2)" 
      : "rgba(156, 163, 175, 0.25)"
  });

  const createNotepadPattern = (gridId: string, gridColor: string) => {
    const gridSize = 20;
    return (
      <pattern
        id={gridId}
        x="0"
        y="0"
        width={gridSize}
        height={gridSize}
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1={gridSize} x2={gridSize} y2={gridSize} stroke={gridColor} strokeWidth="0.5" />
        <line x1={gridSize} y1="0" x2={gridSize} y2={gridSize} stroke={gridColor} strokeWidth="0.5" />
      </pattern>
    );
  };

  const createDotGridPattern = (gridId: string, dotColor: string) => {
    const dotSpacing = 15;
    return (
      <pattern
        id={gridId}
        x="0"
        y="0"
        width={dotSpacing}
        height={dotSpacing}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={dotSpacing / 2} cy={dotSpacing / 2} r="0.8" fill={dotColor} />
      </pattern>
    );
  };

  const createGraphPaperPattern = (gridId: string, gridColor: string) => {
    const gridSize = 10;
    return (
      <pattern
        id={gridId}
        x="0"
        y="0"
        width={gridSize}
        height={gridSize}
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1={gridSize} x2={gridSize} y2={gridSize} stroke={gridColor} strokeWidth="0.3" />
        <line x1={gridSize} y1="0" x2={gridSize} y2={gridSize} stroke={gridColor} strokeWidth="0.3" />
      </pattern>
    );
  };

  const createIsometricPattern = (gridId: string, gridColor: string) => {
    const gridSize = 20;
    const height = gridSize * Math.sqrt(3);
    return (
      <pattern
        id={gridId}
        x="0"
        y="0"
        width={gridSize * 2}
        height={height}
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1={height / 2} x2={gridSize} y2={height} stroke={gridColor} strokeWidth="0.4" />
        <line x1={gridSize} y1="0" x2={gridSize * 2} y2={height / 2} stroke={gridColor} strokeWidth="0.4" />
        <line x1={gridSize} y1={height} x2={gridSize * 2} y2={height / 2} stroke={gridColor} strokeWidth="0.4" />
      </pattern>
    );
  };

  // Generate grid pattern based on background mode
  const generateGridPattern = () => {
    if (backgroundMode === "none") return null;

    const gridId = `grid-pattern-${backgroundMode}-${canvasSettings.mode}`;
    const { gridColor, dotColor } = getGridColors();
    
    const patternMap = {
      notepad: () => createNotepadPattern(gridId, gridColor),
      "dot-grid": () => createDotGridPattern(gridId, dotColor),
      "graph-paper": () => createGraphPaperPattern(gridId, gridColor),
      isometric: () => createIsometricPattern(gridId, gridColor)
    };

    const pattern = patternMap[backgroundMode as keyof typeof patternMap]?.();
    return pattern ? <defs>{pattern}</defs> : null;
  };

  // Get background style based on background mode
  const getBackgroundStyle = () => {
    if (backgroundMode === "none") {
      return { backgroundColor: canvasSettings.background };
    }

    // Soft paper colors for textured backgrounds
    const paperColor = canvasSettings.mode === "dark" 
      ? "#1e1e1e" // Keep dark mode as is
      : "#fefcf6"; // Soft cream/paper color for light mode

    return { backgroundColor: paperColor };
  };

  // Helper function to get cursor style for resize handles
  const getResizeCursor = (handle: string | null): string => {
    if (!handle) return "default";

    switch (handle) {
      case "nw":
      case "se":
        return "nw-resize";
      case "ne":
      case "sw":
        return "ne-resize";
      case "n":
      case "s":
        return "ns-resize";
      case "e":
      case "w":
        return "ew-resize";
      default:
        return "default";
    }
  };


  // Helper function to render resize indicators for selected shapes
  const renderResizeIndicators = (shape: Shape): React.ReactNode => {
    // Show resize handles for all selected shapes (not just the one being dragged)
    if (!selectedShapeIds.includes(shape.id)) {
      return null;
    }

    // Handle arrow types and text - don't show resize indicators for lines/arrows/text
    const isLineLike = shape.type === "line" || 
                      shape.type === "straight-arrow" || 
                      shape.type === "curved-arrow" || 
                      shape.type === "orthogonal-arrow";
    
    if (isLineLike || shape.type === "text") {
      return null; // Don't render visual indicators for arrows/text - they block arrow tips or aren't resizable
    }

    const bounds = getShapeBoundingBox(shape);
    const handleSize = 12;
    const strokeColor = canvasSettings.mode === "dark" ? "#ffffff" : "#000000";
    const fillColor = canvasSettings.mode === "dark" ? "#1e1e1e" : "#ffffff";

    const handles = [
      { name: "nw", x: bounds.left, y: bounds.top },
      { name: "ne", x: bounds.right, y: bounds.top },
      { name: "se", x: bounds.right, y: bounds.bottom },
      { name: "sw", x: bounds.left, y: bounds.bottom },
      { name: "n", x: (bounds.left + bounds.right) / 2, y: bounds.top },
      { name: "e", x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
      { name: "s", x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
      { name: "w", x: bounds.left, y: (bounds.top + bounds.bottom) / 2 },
    ];

    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();

      const mouseX = e.nativeEvent.offsetX;
      const mouseY = e.nativeEvent.offsetY;
      const mousePoint = { x: mouseX, y: mouseY };

      // Use the hook's detectResizeHandle function
      const handle = detectResizeHandle(shape, mousePoint);
      if (handle) {
        // Select the shape if it's not already selected
        if (!selectedShapeIds.includes(shape.id) && onSelectionChange) {
          onSelectionChange([shape.id]);
        }

        // The resize logic is now handled by the hook's handleShapeMouseDown
        // We just need to trigger the mouse down event on the shape
        handleWrappedMouseDown(shape, e);
      }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      const touchPoint = { x: touchX, y: touchY };

      // Use the hook's detectResizeHandle function
      const handle = detectResizeHandle(shape, touchPoint);
      if (handle) {
        // Select the shape if it's not already selected
        if (!selectedShapeIds.includes(shape.id) && onSelectionChange) {
          onSelectionChange([shape.id]);
        }

        // Convert touch to mouse event for compatibility with existing logic
        const mouseEvent = new MouseEvent("mousedown", {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        handleWrappedMouseDown(shape, mouseEvent as any);
      }
    };

    return (
      <g key={`${shape.id}-resize-handles`}>
        {handles.map((handle) => (
          <rect
            key={`${shape.id}-handle-${handle.name}`}
            x={handle.x - handleSize / 2}
            y={handle.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1}
            style={{
              cursor: showInfoModal ? "default" : getResizeCursor(handle.name),
            }}
            onMouseDown={createEventHandler(handleMouseDown)}
            onTouchStart={createEventHandler(handleTouchStart)}
          />
        ))}
      </g>
    );
  };

  // Helper function to get editor rectangle for label editing
  const getEditorRect = (shape: Shape) => {
    const center = getShapeCenter(shape);
    const width = 120;
    const height = 60;
    return {
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
    };
  };

  // Track drag state changes to set our ref-based flag
  useEffect(() => {
    const isCurrentlyDragging = !!(draggedShape || draggedShapes || lineResizeDraggedShape) && dragHasMoved;
    
    if (isCurrentlyDragging && !isDraggingRef.current) {
      isDraggingRef.current = true;
      if (dragCompletionTimeoutRef.current) {
        clearTimeout(dragCompletionTimeoutRef.current);
        dragCompletionTimeoutRef.current = null;
      }
    } else if (!isCurrentlyDragging && isDraggingRef.current) {
      dragCompletionTimeoutRef.current = setTimeout(() => {
        isDraggingRef.current = false;
        mouseInteractionActiveRef.current = false;
        dragCompletionTimeoutRef.current = null;
      }, 150);
    }
    
    return () => {
      if (dragCompletionTimeoutRef.current) {
        clearTimeout(dragCompletionTimeoutRef.current);
      }
    };
  }, [draggedShape, draggedShapes, lineResizeDraggedShape, dragHasMoved]);

  // Shape rendering helpers
  const createInvisibleHitArea = (shape: Shape) => ({
    ...shape,
    style: {
      ...shape.style,
      stroke: "transparent",
      fill: "transparent",
    },
  });

  const renderSketchShape = (shape: Shape) => {
    const supportedTypes = ["rectangle", "square", "circle", "diamond", "triangle", "line"];
    if (!supportedTypes.includes(shape.type) || !svgRef.current) {
      return renderNormalShape(shape);
    }

    const roughMarkup = renderRoughShapeSVG(
      svgRef.current,
      shape.type,
      shape,
      {
        roughness: 2.2,
        stroke: shape.style?.stroke || "#000",
        strokeWidth: shape.style?.strokeWidth || 2,
        fill: shape.style?.fill || undefined,
        fillStyle: "hachure",
        seed: hashCode(shape.id),
      },
    );

    return roughMarkup ? (
      <g key={shape.id}>
        <g dangerouslySetInnerHTML={{ __html: roughMarkup }} />
        {renderShape(
          createInvisibleHitArea(shape),
          handleShapeClickWrapper,
          selectedShapeIds.includes(shape.id) ? shape.id : undefined,
          editingShape?.id,
          handleCustomShapeDoubleClick,
          handleWrappedMouseDown,
          currentTool,
          sketchModeEnabled,
          currentFontSize,
          showInfoModal,
        )}
        {renderShapeOverlay(
          shape,
          editingShape?.id,
          sketchModeEnabled,
          currentFontSize,
        )}
      </g>
    ) : null;
  };

  const renderNormalShape = (shape: Shape) => {
    return renderShape(
      shape,
      handleShapeClickWrapper,
      selectedShapeIds.includes(shape.id) ? shape.id : undefined,
      editingShape?.id,
      handleCustomShapeDoubleClick,
      handleWrappedMouseDown,
      currentTool,
      sketchModeEnabled,
      currentFontSize,
      showInfoModal,
    );
  };

  // Wrapper function that handles shape clicks and prevents hook's click logic in select mode
  const handleShapeClickWrapper = (shape: Shape, position: Point, event?: React.MouseEvent) => {
    if (isDraggingRef.current || justCompletedDrag || 
        draggedShape || draggedShapes || lineResizeDraggedShape) {
      return;
    }
    
    handleCustomShapeClick(shape, position, event);
  };

  return (
    <div className="relative w-full h-full">
      {/* Information Icon */}
      <button
        onClick={() => onShowInfoModal(true)}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${canvasSettings.mode === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
            : "bg-white hover:bg-gray-100 text-gray-700"
          }`}
        title="Shape Snap Help"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <svg
        ref={svgRef}
        data-shapesnap-canvas="true"
        width={width}
        height={height}
        style={{
          ...getBackgroundStyle(),
          touchAction: "none",
          cursor: getResizeCursor(resizeHandle),
          pointerEvents: showInfoModal ? "none" : "auto",
        }}
        {...(showInfoModal
          ? {}
          : {
            onDoubleClick: handleCanvasDoubleClick,
            onMouseDown: handleCanvasMouseDown,
            onMouseMove: handleWrappedMouseMove,
            onMouseUp: handleWrappedMouseUp,
            onClick: handleCanvasClick,
            onTouchStart: (e) => {
              // Prevent default to avoid scrolling
              e.preventDefault();
              // Convert touch to mouse event for compatibility
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
              });
              e.currentTarget.dispatchEvent(mouseEvent);
            },
            onTouchMove: (e) => {
              // Prevent default to avoid scrolling
              e.preventDefault();
              // Convert touch to mouse event for compatibility
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
              });
              e.currentTarget.dispatchEvent(mouseEvent);
            },
            onTouchEnd: (e) => {
              // Prevent default to avoid any unwanted behavior
              e.preventDefault();
              // Convert touch to mouse event for compatibility
              const mouseEvent = new MouseEvent("mouseup", {
                bubbles: true,
              });
              e.currentTarget.dispatchEvent(mouseEvent);
            },
          })}
      >
        {/* Generate grid pattern definition */}
        {generateGridPattern()}

        {/* Render grid background based on background mode */}
        {backgroundMode !== "none" && (
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill={`url(#grid-pattern-${backgroundMode}-${canvasSettings.mode})`}
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Render all shapes */}
        {shapesToRender.map((shape) =>
          sketchModeEnabled ? renderSketchShape(shape) : renderNormalShape(shape)
        )}

        {/* Render current drawing stroke */}
        {currentPoints.length > 1 && (
          <path
            d={`M ${currentPoints.map((p) => `${p.x},${p.y}`).join(" L ")}`}
            stroke={strokeColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* Render label editor INSIDE the SVG */}
        {editingShape &&
          (() => {
            const { x, y, width, height } = getEditorRect(editingShape);
            return (
              <ShapeLabelEditor
                shape={editingShape}
                onSave={handleLabelSave}
                onCancel={handleLabelCancel}
                x={x}
                y={y}
                width={width}
                height={height}
                canvasMode={canvasSettings.mode}
              />
            );
          })()}

        {/* Render drag guides */}
        {dragGuides && (
          <g>
            {/* Vertical guides */}
            <line
              key="drag-guide-left"
              x1={dragGuides.left}
              y1={0}
              x2={dragGuides.left}
              y2={height}
              stroke={canvasSettings.mode === "dark" ? "#ffffff" : "#000000"}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-right"
              x1={dragGuides.right}
              y1={0}
              x2={dragGuides.right}
              y2={height}
              stroke={canvasSettings.mode === "dark" ? "#ffffff" : "#000000"}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            {/* Horizontal guides */}
            <line
              key="drag-guide-top"
              x1={0}
              y1={dragGuides.top}
              x2={width}
              y2={dragGuides.top}
              stroke={canvasSettings.mode === "dark" ? "#ffffff" : "#000000"}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
            <line
              key="drag-guide-bottom"
              x1={0}
              y1={dragGuides.bottom}
              x2={width}
              y2={dragGuides.bottom}
              stroke={canvasSettings.mode === "dark" ? "#ffffff" : "#000000"}
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.3}
            />
          </g>
        )}

        {/* Render selection rectangle */}
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode={canvasSettings.mode}
        />

        {/* Render resize indicators */}
        {shapesToRender.map((shape) => renderResizeIndicators(shape))}
      </svg>

      {/* Information Modal */}
      <ShapeSnapInfoModal
        isOpen={showInfoModal}
        onClose={() => onShowInfoModal(false)}
        canvasMode={canvasSettings.mode}
      />
    </div>
  );
};
