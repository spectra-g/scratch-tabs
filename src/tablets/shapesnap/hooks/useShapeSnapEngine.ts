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

    const updatedShapes = state.shapes.map(shape => 
      shape.id === shapeId 
        ? { ...shape, ...updates }
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
  
  // Delete a shape by ID
  const deleteShape = useCallback((shapeId: string) => {
    const updatedShapes = state.shapes.filter(shape => shape.id !== shapeId);
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  }, [state, onChange]);
  
  // Delete selected shapes
  const deleteSelectedShapes = useCallback(() => {
    if (!state.selectedShapeIds || state.selectedShapeIds.length === 0) return;
    
    const updatedShapes = state.shapes.filter(shape => 
      !state.selectedShapeIds!.includes(shape.id)
    );
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedShapeIds: [] // Clear selection after deletion
    });
  }, [state, onChange]);
  
  // Copy selected shapes to clipboard
  const copySelectedShapes = useCallback(() => {
    if (!state.selectedShapeIds || state.selectedShapeIds.length === 0) return;
    
    const selectedShapes = state.shapes.filter(shape => 
      state.selectedShapeIds!.includes(shape.id)
    );
    
    // Deep copy the shapes to avoid reference issues
    const copiedShapes = selectedShapes.map(shape => ({
      ...shape,
      id: generateId() // Generate new IDs for copies
    }));
    
    onChange({
      ...state,
      clipboard: copiedShapes
    });
  }, [state, onChange]);
  
  // Cut selected shapes (copy + delete)
  const cutSelectedShapes = useCallback(() => {
    if (!state.selectedShapeIds || state.selectedShapeIds.length === 0) return;
    
    const selectedShapes = state.shapes.filter(shape => 
      state.selectedShapeIds!.includes(shape.id)
    );
    
    // Deep copy the shapes to clipboard
    const copiedShapes = selectedShapes.map(shape => ({
      ...shape,
      id: generateId() // Generate new IDs for copies
    }));
    
    // Remove selected shapes from canvas
    const updatedShapes = state.shapes.filter(shape => 
      !state.selectedShapeIds!.includes(shape.id)
    );
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      clipboard: copiedShapes,
      selectedShapeIds: [] // Clear selection after cut
    });
  }, [state, onChange]);
  
  // Paste shapes from clipboard
  const pasteShapes = useCallback(() => {
    if (!state.clipboard || state.clipboard.length === 0) return;
    
    // Offset pasted shapes slightly to avoid exact overlap
    const offset = 20;
    const pastedShapes = state.clipboard.map(shape => ({
      ...shape,
      id: generateId(), // Generate new unique IDs
      zIndex: Date.now(), // Ensure pasted shapes appear on top
      // Apply offset based on shape type
      ...(shape.type === 'line' ? {
        points: (shape as any).points.map((point: Point) => ({
          x: point.x + offset,
          y: point.y + offset
        }))
      } : shape.type === 'arrow' ? {
        from: { x: (shape as any).from.x + offset, y: (shape as any).from.y + offset },
        to: { x: (shape as any).to.x + offset, y: (shape as any).to.y + offset }
      } : {
        x: (shape as any).x + offset,
        y: (shape as any).y + offset
      })
    }));
    
    const updatedShapes = [...state.shapes, ...pastedShapes];
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    // Select the newly pasted shapes
    const pastedShapeIds = pastedShapes.map(shape => shape.id);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      selectedShapeIds: pastedShapeIds
    });
  }, [state, onChange]);
  
  // Set selected shapes
  const setSelectedShapes = useCallback((shapeIds: string[]) => {
    onChange({
      ...state,
      selectedShapeIds: shapeIds
    });
  }, [state, onChange]);
  
  // Toggle shape selection (for multi-select with Ctrl/Cmd)
  const toggleShapeSelection = useCallback((shapeId: string) => {
    const currentSelection = state.selectedShapeIds || [];
    const isSelected = currentSelection.includes(shapeId);
    
    let newSelection: string[];
    if (isSelected) {
      // Remove from selection
      newSelection = currentSelection.filter(id => id !== shapeId);
    } else {
      // Add to selection
      newSelection = [...currentSelection, shapeId];
    }
    
    onChange({
      ...state,
      selectedShapeIds: newSelection
    });
  }, [state, onChange]);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    onChange({
      ...state,
      selectedShapeIds: []
    });
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
      
      // Add default arrow tip to straight lines only
      if (newShape.type === 'line' && newShape.points && newShape.points.length === 2) {
        (newShape as any).arrowTipEnd = 'simple';
        (newShape as any).arrowTipSize = 10;
      }
      
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
    // Use the specific data attribute to find the canvas SVG
    const svgElement = document.querySelector('[data-shapesnap-canvas="true"]') as SVGSVGElement;
    
    if (!svgElement) {
      console.error('❌ Canvas SVG element not found for export');
      alert('Could not find the canvas to export. Please try again.');
      return;
    }
    
    const canvas = document.createElement('canvas');
    const width = svgElement.clientWidth || 800; // fallback width
    const height = svgElement.clientHeight || 600; // fallback height
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Could not get canvas context');
      return;
    }
    
    // Set background color based on canvas mode
    const backgroundColor = state.canvas.mode === 'dark' ? '#1e1e1e' : '#ffffff';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Serialize the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      try {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        // Convert to PNG and download
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `shapesnap-export-${Date.now()}.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('❌ Error during PNG export:', error);
        alert('Error during export. Please try again.');
      }
    };
    
    img.onerror = (error) => {
      console.error('❌ Error loading SVG for export:', error);
      URL.revokeObjectURL(url);
      alert('Error loading canvas for export. Please try again.');
    };
    
    img.src = url;
  }, [state.canvas.mode]);
  
  // Cycle through font sizes
  const cycleFontSize = useCallback(() => {
    const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
    const currentIndex = fontSizes.indexOf(state.currentFontSize || 16);
    const nextIndex = (currentIndex + 1) % fontSizes.length;
    const newFontSize = fontSizes[nextIndex];
    
    // Update all text shapes with the new font size
    const updatedShapes = state.shapes.map(shape => {
      if (shape.type === 'text') {
        // Ensure the fontSize property exists and is updated
        return {
          ...shape,
          fontSize: newFontSize
        };
      }
      return shape;
    });
    
    // Update history with the new shapes
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(updatedShapes);
    
    onChange({
      ...state,
      shapes: updatedShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      currentFontSize: newFontSize
    });
  }, [state, onChange]);
  
  return {
    addShape,
    updateShapeLabel,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    copySelectedShapes,
    cutSelectedShapes,
    pasteShapes,
    setSelectedShapes,
    toggleShapeSelection,
    clearSelection,
    detectAndAddShape,
    setTool,
    toggleCanvasMode,
    undo,
    redo,
    clearCanvas,
    exportToImage,
    cycleFontSize,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1
  };
};