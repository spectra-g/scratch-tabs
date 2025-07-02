import React, { useState, useRef, useEffect } from 'react';
import { ShapeSnapData, DrawState, ShapeSnapTemplate } from '../types';
import { useShapeSnapEngine } from '../hooks/useShapeSnapEngine';
import { ShapeSnapCanvas } from './ShapeSnapCanvas';
import { ShapeSnapToolbar } from './ShapeSnapToolbar';
import { ShapeSnapStatusBar } from './ShapeSnapStatusBar';
import { ShapeSnapTemplatesPanel } from './ShapeSnapTemplatesPanel';

interface ShapeSnapUIProps {
  state: ShapeSnapData;
  onChange: (newState: ShapeSnapData) => void;
}

export const ShapeSnapUI: React.FC<ShapeSnapUIProps> = ({ state, onChange }) => {
  const [drawState, setDrawState] = useState<DrawState>({
    isDrawing: false,
    currentPoints: [],
    startPoint: null
  });
  const [gridSnappingEnabled, setGridSnappingEnabled] = useState(false);
  const [sketchModeEnabled, setSketchModeEnabled] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const engine = useShapeSnapEngine(state, onChange);
  
  // Template functions
  const handleApplyTemplate = (template: ShapeSnapTemplate) => {
    onChange({
      ...state,
      shapes: [...template.shapes],
      canvas: template.canvas,
      history: [template.shapes],
      historyIndex: 0
    });
  };
  
  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
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
      // Don't handle keyboard shortcuts if we're in an input field or modal
      if (showInfoModal || 
          e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      switch (e.key) {
        case 'c':
        case 'C':
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.copySelectedShapes();
          }
          break;
        case 'v':
        case 'V':
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.pasteShapes();
          }
          break;
        case 'x':
        case 'X':
          if (ctrlOrCmd) {
            e.preventDefault();
            engine.cutSelectedShapes();
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          engine.deleteSelectedShapes();
          break;
        case 'Escape':
          e.preventDefault();
          engine.clearSelection();
          break;
        case 'a':
        case 'A':
          if (ctrlOrCmd) {
            e.preventDefault();
            // Select all shapes
            const allShapeIds = state.shapes.map(shape => shape.id);
            engine.setSelectedShapes(allShapeIds);
          }
          break;
      }
    };

    // Add event listener to the UI container
    const uiElement = uiRef.current;
    if (uiElement) {
      uiElement.addEventListener('keydown', handleKeyDown);
      // Make sure the element can receive focus
      uiElement.focus();
    }

    return () => {
      if (uiElement) {
        uiElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [engine, showInfoModal, state.shapes]);

  // Helper function to get point from event (mouse or touch)
  const getPointFromEvent = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };
  
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || state.currentTool !== 'draw') return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== 'draw') return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState(prev => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point]
    }));
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== 'draw') return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    const finalPoints = [...drawState.currentPoints, point];
    
    // Instead of detecting and adding shape here, call onDrawEnd
    if (typeof engine.detectAndAddShape === 'function') {
      engine.detectAndAddShape(finalPoints);
    }
    
    // Reset drawing state
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  const handleMouseLeave = () => {
    if (showInfoModal || !drawState.isDrawing || drawState.currentPoints.length <= 1) return;
    
    // Finish the drawing if mouse leaves canvas
    if (typeof engine.detectAndAddShape === 'function') {
      engine.detectAndAddShape(drawState.currentPoints);
    }
    
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || state.currentTool !== 'draw') return;
    
    // Prevent default to avoid scrolling while drawing
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point
    });
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== 'draw') return;
    
    // Prevent default to avoid scrolling while drawing
    e.preventDefault();
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState(prev => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point]
    }));
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (showInfoModal || !drawState.isDrawing || state.currentTool !== 'draw') return;
    
    // Prevent default to avoid any unwanted behavior
    e.preventDefault();
    
    // For touch end, we don't add a final point since the last touch move already captured it
    const finalPoints = [...drawState.currentPoints];
    
    // Instead of detecting and adding shape here, call onDrawEnd
    if (typeof engine.detectAndAddShape === 'function') {
      engine.detectAndAddShape(finalPoints);
    }
    
    // Reset drawing state
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  const handleTouchCancel = () => {
    if (showInfoModal || !drawState.isDrawing || drawState.currentPoints.length <= 1) return;
    
    // Finish the drawing if touch is cancelled
    if (typeof engine.detectAndAddShape === 'function') {
      engine.detectAndAddShape(drawState.currentPoints);
    }
    
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  return (
    <div 
      ref={uiRef}
      className="h-full flex flex-col bg-gray-900 outline-none"
      tabIndex={0} // Make the container focusable for keyboard events
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
        onToggleGridSnapping={() => setGridSnappingEnabled(s => !s)}
        sketchModeEnabled={sketchModeEnabled}
        onToggleSketchMode={() => setSketchModeEnabled(s => !s)}
        onToggleTemplates={() => setShowTemplatesPanel(s => !s)}
      />
      
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          touchAction: 'none' // Prevent default touch behaviors like scrolling
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
          onUpdateLabel={engine.updateShapeLabel}
          onUpdateShape={engine.updateShape}
          onDeleteShape={engine.deleteShape}
          onAddShape={engine.addShape}
          onDrawEnd={engine.detectAndAddShape}
          onSelectionChange={engine.setSelectedShapes}
          onToggleShapeSelection={engine.toggleShapeSelection}
          onClearSelection={engine.clearSelection}
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
      
      {/* Templates Panel */}
      {showTemplatesPanel && (
        <ShapeSnapTemplatesPanel
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplatesPanel(false)}
        />
      )}
    </div>
  );
};