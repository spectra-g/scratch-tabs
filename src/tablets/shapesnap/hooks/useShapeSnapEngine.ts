import { useCallback } from 'react';
import { ShapeSnapData, Point, Shape, ShapeSnapTool } from '../types';
import { detectShape } from '../utils/shapeDetection';

const generateId = (): string => `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const useShapeSnapEngine = (
  state: ShapeSnapData,
  onChange: (newState: ShapeSnapData) => void
) => {
  // Add a new shape to the canvas
  const addShape = useCallback((shape: Shape) => {
    const newShapes = [...state.shapes, shape];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    onChange({
      ...state,
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }, [state, onChange]);
  
  // Update a shape's label
  const updateShapeLabel = useCallback((shapeId: string, label: string) => {
    const updatedShapes = state.shapes.map(shape => 
      shape.id === shapeId 
        ? { ...shape, label: label || undefined }
        : shape
    );
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }, [state, onChange]);
  
  // Update a shape with new properties
  const updateShape = useCallback((shapeId: string, updates: any) => {
    console.log('🚀 updateShape called:', { shapeId, updates });
    console.log('📊 Current shapes count:', state.shapes.length);
    
    const updatedShapes = state.shapes.map(shape => 
      shape.id === shapeId 
        ? { ...shape, ...updates }
        : shape
    );
    
    console.log('✅ Shapes updated, new count:', updatedShapes.length);
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
    
    console.log('💾 State updated via onChange');
  }, [state, onChange]);
  
  // Delete a shape by ID
  const deleteShape = useCallback((shapeId: string) => {
    console.log('🗑️ deleteShape called:', shapeId);
    console.log('📊 Current shapes count:', state.shapes.length);
    
    const updatedShapes = state.shapes.filter(shape => shape.id !== shapeId);
    
    console.log('✅ Shape deleted, new count:', updatedShapes.length);
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
    
    console.log('💾 State updated via onChange');
  }, [state, onChange]);
  
  // Detect and add a shape based on drawn points
  const detectAndAddShape = useCallback((points: Point[]) => {
    if (points.length < 2) return null;
    const detectedGeometry = detectShape(points);
    if (detectedGeometry) {
      const strokeColor = state.canvas.mode === 'dark' ? '#ffffff' : '#000000';
      const newShape: Shape = {
        ...detectedGeometry,
        id: generateId(),
        style: {
          stroke: strokeColor,
          fill: 'transparent',
          strokeWidth: 2,
        },
        zIndex: Date.now(),
      } as Shape;
      addShape(newShape);
      return newShape;
    }
    return null;
  }, [addShape, state.canvas.mode]);
  
  // Set the current drawing tool
  const setTool = useCallback((tool: ShapeSnapTool) => {
    onChange({
      ...state,
      currentTool: tool
    });
  }, [state, onChange]);
  
  // Toggle canvas mode and update all shapes' colors
  const toggleCanvasMode = useCallback(() => {
    const newMode = state.canvas.mode === 'dark' ? 'light' : 'dark';
    const newBackground = newMode === 'dark' ? '#1e1e1e' : '#ffffff';
    const newStrokeColor = newMode === 'dark' ? '#ffffff' : '#000000';
    const updatedShapes = state.shapes.map(shape => ({
      ...shape,
      style: {
        ...shape.style,
        stroke: newStrokeColor,
      }
    }));
    const newHistory = state.history.map(historyState =>
      historyState.map(shape => ({
        ...shape,
        style: {
          ...shape.style,
          stroke: newStrokeColor,
        }
      }))
    );
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      canvas: {
        ...state.canvas,
        mode: newMode,
        background: newBackground
      }
    });
  }, [state, onChange]);
  
  // Undo the last action
  const undo = useCallback(() => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      onChange({
        ...state,
        shapes: state.history[newIndex],
        historyIndex: newIndex
      });
    }
  }, [state, onChange]);
  
  // Redo a previously undone action
  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      onChange({
        ...state,
        shapes: state.history[newIndex],
        historyIndex: newIndex
      });
    }
  }, [state, onChange]);
  
  // Clear the canvas
  const clearCanvas = useCallback(() => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push([]);
    onChange({
      ...state,
      shapes: [],
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }, [state, onChange]);
  
  // Export the canvas to an image
  const exportToImage = useCallback(() => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'shapesnap-export.png';
        link.href = pngUrl;
        link.click();
      }
    };
    img.src = url;
  }, []);
  
  return {
    addShape,
    updateShapeLabel,
    updateShape,
    deleteShape,
    detectAndAddShape,
    setTool,
    toggleCanvasMode,
    undo,
    redo,
    clearCanvas,
    exportToImage,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1
  };
};