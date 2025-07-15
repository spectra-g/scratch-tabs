import React, { useState, useRef, useEffect, useCallback } from "react"; // Add useCallback
import { ShapeSnapData, DrawState, ShapeSnapTemplate, Shape, Point } from "../types";
import { useShapeSnapEngineV2 } from "../hooks/useShapeSnapEngineV2";
import { ShapeSnapCanvas } from "./ShapeSnapCanvas";
import { ShapeSnapToolbar } from "./ShapeSnapToolbar";
import { ShapeSnapStatusBar } from "./ShapeSnapStatusBar";
import { ShapeSnapTemplatesPanel } from "./ShapeSnapTemplatesPanel";

interface ShapeSnapUIProps {
  state: ShapeSnapData;
  onChange: (newState: ShapeSnapData) => void;
}

export const ShapeSnapUI: React.FC<ShapeSnapUIProps> = ({
  state,
  onChange,
}) => {
  const [drawState, setDrawState] = useState<DrawState>({
    isDrawing: false,
    currentPoints: [],
    startPoint: null,
  });
  const [gridSnappingEnabled, setGridSnappingEnabled] = useState(false);
  const [sketchModeEnabled, setSketchModeEnabled] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const engine = useShapeSnapEngineV2(state, onChange);

  // --- START OF STABILIZED CALLBACKS ---
  const handleApplyTemplate = useCallback((template: ShapeSnapTemplate) => {
    onChange({
      ...state,
      shapes: [...template.shapes],
      canvas: template.canvas,
      history: [template.shapes],
      historyIndex: 0,
    });
  }, [onChange, state]);

  const onUpdateLabel = useCallback((shapeId: string, label: string) => {
    engine.updateShapeLabel(shapeId, label);
  }, [engine]);

  const onUpdateShape = useCallback((shapeId: string, updates: Partial<Shape>) => {
    engine.updateShape(shapeId, updates);
  }, [engine]);

  const onDeleteShape = useCallback((shapeId: string) => {
    engine.deleteShape(shapeId);
  }, [engine]);

  const onAddShape = useCallback((shape: Shape) => {
    engine.addShape(shape);
  }, [engine]);

  const onShapeClick = useCallback((shape: Shape, position: Point) => {
    // If in eraser mode, delete the shape
    if (state.currentTool === "eraser") {
      engine.deleteShape(shape.id);
      return;
    }
    
    // Otherwise, select the shape when clicked
    engine.setSelectedShapes([shape.id]);
  }, [engine, state.selectedShapeIds, state.currentTool]);

  const onDrawEnd = useCallback((points: Point[]) => {
    return engine.detectAndAddShape(points);
  }, [engine]);

  const onSelectionChange = useCallback((shapeIds: string[]) => {
    engine.setSelectedShapes(shapeIds);
  }, [engine]);

  const onToggleShapeSelection = useCallback((shapeId: string) => {
    engine.toggleShapeSelection(shapeId);
  }, [engine]);

  const onClearSelection = useCallback(() => {
    engine.clearSelection();
  }, [engine]);
  // --- END OF STABILIZED CALLBACKS ---

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showInfoModal ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      switch (e.key) {
        case "c":
        case "C":
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.copySelectedShapes();
          }
          break;
        case "v":
        case "V":
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.pasteShapes();
          }
          break;
        case "x":
        case "X":
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.cutSelectedShapes();
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          engine.deleteSelectedShapes();
          break;
        case "Escape":
          e.preventDefault();
          engine.clearSelection();
          break;
        case "a":
        case "A":
          if (ctrlOrCmd) {
            e.preventDefault();
            const allShapeIds = state.shapes.map((shape) => shape.id);
            engine.setSelectedShapes(allShapeIds);
          }
          break;
      }
    };

    const uiElement = uiRef.current;
    if (uiElement) {
      uiElement.addEventListener("keydown", handleKeyDown);
      uiElement.focus();
    }

    return () => {
      if (uiElement) {
        uiElement.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [engine, showInfoModal, state.shapes]);

  const getPointFromEvent = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    let clientX: number, clientY: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || state.currentTool !== "draw") return;
    const point = getPointFromEvent(e);
    if (!point) return;
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== "draw") return;
    const point = getPointFromEvent(e);
    if (!point) return;
    setDrawState((prev) => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point],
    }));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== "draw") return;
    const point = getPointFromEvent(e);
    if (!point) return;
    const finalPoints = [...drawState.currentPoints, point];
    onDrawEnd(finalPoints);
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null,
    });
  };

  const handleMouseLeave = () => {
    if (
      showInfoModal ||
      !drawState.isDrawing ||
      drawState.currentPoints.length <= 1
    ) return;
    onDrawEnd(drawState.currentPoints);
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || state.currentTool !== "draw") return;
    e.preventDefault();
    const point = getPointFromEvent(e);
    if (!point) return;
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== "draw") return;
    e.preventDefault();
    const point = getPointFromEvent(e);
    if (!point) return;
    setDrawState((prev) => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point],
    }));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== "draw") return;
    e.preventDefault();
    const finalPoints = [...drawState.currentPoints];
    onDrawEnd(finalPoints);
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null,
    });
  };

  const handleTouchCancel = () => {
    if (
      showInfoModal ||
      !drawState.isDrawing ||
      drawState.currentPoints.length <= 1
    ) return;
    onDrawEnd(drawState.currentPoints);
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null,
    });
  };

  return (
    <div
      ref={uiRef}
      className="h-full flex flex-col bg-gray-900 outline-none"
      tabIndex={0}
    >
      <ShapeSnapToolbar
        currentTool={state.currentTool}
        canvasMode={state.canvas.mode}
        canUndo={engine.canUndo}
        canRedo={engine.canRedo}
        currentFontSize={state.currentFontSize || 16}
        onToolChange={engine.setTool}
        onModeChange={engine.toggleCanvasMode}
        onUndo={engine.undo}
        onRedo={engine.redo}
        onClear={engine.clearCanvas}
        onExport={engine.exportToImage}
        onCycleFontSize={engine.cycleFontSize}
        gridSnappingEnabled={gridSnappingEnabled}
        onToggleGridSnapping={() => setGridSnappingEnabled((s) => !s)}
        sketchModeEnabled={sketchModeEnabled}
        onToggleSketchMode={() => setSketchModeEnabled((s) => !s)}
        onToggleTemplates={() => setShowTemplatesPanel((s) => !s)}
      />

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          touchAction: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <ShapeSnapCanvas
          shapes={state.shapes}
          canvasSettings={state.canvas}
          currentPoints={drawState.currentPoints}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={state.currentTool}
          currentFontSize={state.currentFontSize || 16}
          selectedShapeIds={state.selectedShapeIds || []}
          onShapeClick={onShapeClick}
          onUpdateLabel={onUpdateLabel}
          onUpdateShape={onUpdateShape}
          onDeleteShape={onDeleteShape}
          onAddShape={onAddShape}
          onDrawEnd={onDrawEnd}
          onSelectionChange={onSelectionChange}
          onToggleShapeSelection={onToggleShapeSelection}
          onClearSelection={onClearSelection}
          gridSnappingEnabled={gridSnappingEnabled}
          sketchModeEnabled={sketchModeEnabled}
          showInfoModal={showInfoModal}
          onShowInfoModal={setShowInfoModal}
        />
      </div>

      <ShapeSnapStatusBar
        shapeCount={state.shapes.length}
        currentTool={state.currentTool}
        canvasMode={state.canvas.mode}
        selectedCount={state.selectedShapeIds?.length || 0}
      />

      {showTemplatesPanel && (
        <ShapeSnapTemplatesPanel
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplatesPanel(false)}
        />
      )}
    </div>
  );
};
