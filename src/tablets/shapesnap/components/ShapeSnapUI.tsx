import React, { useState, useRef, useEffect } from 'react';
import { ShapeSnapData, DrawState } from '../types';
import { useShapeSnapEngine } from '../hooks/useShapeSnapEngine';
import { ShapeSnapCanvas } from './ShapeSnapCanvas';
import { ShapeSnapToolbar } from './ShapeSnapToolbar';
import { ShapeSnapStatusBar } from './ShapeSnapStatusBar';

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
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const engine = useShapeSnapEngine(state, onChange);
  
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
    if (state.currentTool !== 'draw') return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setDrawState(prev => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point]
    }));
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
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
    if (drawState.isDrawing && drawState.currentPoints.length > 1) {
      // Finish the drawing if mouse leaves canvas
      if (typeof engine.detectAndAddShape === 'function') {
        engine.detectAndAddShape(drawState.currentPoints);
      }
    }
    
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (state.currentTool !== 'draw') return;
    
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
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
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
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
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
    if (drawState.isDrawing && drawState.currentPoints.length > 1) {
      // Finish the drawing if touch is cancelled
      if (typeof engine.detectAndAddShape === 'function') {
        engine.detectAndAddShape(drawState.currentPoints);
      }
    }
    
    setDrawState({
      isDrawing: false,
      currentPoints: [],
      startPoint: null
    });
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
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
      />
      
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ touchAction: 'none' }} // Prevent default touch behaviors like scrolling
      >
        <ShapeSnapCanvas 
          shapes={state.shapes}
          canvasSettings={state.canvas}
          currentPoints={drawState.currentPoints}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={state.currentTool}
          currentFontSize={state.currentFontSize || 16}
          onUpdateLabel={engine.updateShapeLabel}
          onUpdateShape={engine.updateShape}
          onDeleteShape={engine.deleteShape}
          onAddShape={engine.addShape}
          onDrawEnd={engine.detectAndAddShape}
          gridSnappingEnabled={gridSnappingEnabled}
          sketchModeEnabled={sketchModeEnabled}
        />
      </div>
      
      <ShapeSnapStatusBar 
        shapeCount={state.shapes.length}
        currentTool={state.currentTool}
        canvasMode={state.canvas.mode}
      />
    </div>
  );
};