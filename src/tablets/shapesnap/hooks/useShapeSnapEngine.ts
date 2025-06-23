import { useCallback } from 'react';
import { ShapeSnapData, Point, Shape, ShapeSnapTool, ShapeType } from '../types';
import { detectShape } from '../utils/shapeDetection';

export const useShapeSnapEngine = (
  state: ShapeSnapData,
  onChange: (newState: ShapeSnapData) => void
) => {
  // Add a new shape to the canvas
  const addShape = useCallback((shape: Shape) => {
    const newShapes = [...state.shapes, shape];
    
    // Create a new history entry
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    
    onChange({
      ...state,
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }, [state, onChange]);
  
  // Detect and add a shape based on drawn points
  const detectAndAddShape = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const detectedShape = detectShape(points);
    if (detectedShape) {
      addShape(detectedShape);
    }
  }, [addShape]);
  
  // Set the current drawing tool
  const setTool = useCallback((tool: ShapeSnapTool) => {
    onChange({
      ...state,
      currentTool: tool
    });
  }, [state, onChange]);
  
  // Toggle between dark and light mode
  const toggleCanvasMode = useCallback(() => {
    const newMode = state.canvas.mode === 'dark' ? 'light' : 'dark';
    const newBackground = newMode === 'dark' ? '#1e1e1e' : '#ffffff';
    
    onChange({
      ...state,
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
    // Create a new history entry with empty shapes
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
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.clientWidth;
    canvas.height = svgElement.clientHeight;
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Draw SVG on canvas
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        // Convert canvas to PNG
        const pngUrl = canvas.toDataURL('image/png');
        
        // Create download link
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