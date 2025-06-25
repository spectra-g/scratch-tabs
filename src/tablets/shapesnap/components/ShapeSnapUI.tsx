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
  
  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.currentTool !== 'draw') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDrawState({
      isDrawing: true,
      currentPoints: [point],
      startPoint: point
    });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setDrawState(prev => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point]
    }));
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawState.isDrawing || state.currentTool !== 'draw') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
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
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <ShapeSnapToolbar 
        currentTool={state.currentTool}
        canvasMode={state.canvas.mode}
        canUndo={engine.canUndo}
        canRedo={engine.canRedo}
        onToolChange={engine.setTool}
        onModeChange={engine.toggleCanvasMode}
        onUndo={engine.undo}
        onRedo={engine.redo}
        onClear={engine.clearCanvas}
        onExport={engine.exportToImage}
        gridSnappingEnabled={gridSnappingEnabled}
        onToggleGridSnapping={() => setGridSnappingEnabled(s => !s)}
      />
      
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <ShapeSnapCanvas 
          shapes={state.shapes}
          canvasSettings={state.canvas}
          currentPoints={drawState.currentPoints}
          width={canvasSize.width}
          height={canvasSize.height}
          currentTool={state.currentTool}
          onUpdateLabel={engine.updateShapeLabel}
          onUpdateShape={engine.updateShape}
          onDeleteShape={engine.deleteShape}
          onDrawEnd={engine.detectAndAddShape}
          gridSnappingEnabled={gridSnappingEnabled}
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