import React, { useState } from 'react';
import { CanvasSettings, Shape, Point, ShapeSnapTool } from '../types';
import { renderShape, getShapeCenter } from '../utils/renderUtils';
import { ShapeLabelEditor } from './ShapeLabelEditor';
import { cloneDeep } from 'lodash';

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
  currentTool: ShapeSnapTool;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape?: (shapeId: string) => void;
  onDrawEnd?: (points: Point[]) => Shape | null;
  gridSnappingEnabled?: boolean;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height,
  currentTool,
  onShapeClick,
  onUpdateLabel,
  onUpdateShape,
  onDeleteShape,
  gridSnappingEnabled
}) => {
  const [selectedShapeId, setSelectedShapeId] = useState<string | undefined>(undefined);
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lineDragMode, setLineDragMode] = useState<'move' | 'resize-start' | 'resize-end' | null>(null);
  const [lineDragPoint, setLineDragPoint] = useState<Point | null>(null);
  
  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  // If we're dragging a shape, replace it with the dragged version for visual feedback
  const shapesToRender = draggedShape 
    ? sortedShapes.map(shape => shape.id === draggedShape.id ? draggedShape : shape)
    : sortedShapes;
  
  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
  
  // Helper: snap a value to the nearest grid
  const snapToGrid = (value: number, grid: number) => gridSnappingEnabled ? Math.round(value / grid) * grid : value;

  // Helper function to calculate distance between two points
  const distance = (p1: Point, p2: Point): number => 
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  // Helper function to detect line drag mode
  const detectLineDragMode = (shape: Shape, mousePoint: Point): 'move' | 'resize-start' | 'resize-end' => {
    if (shape.type !== 'line') return 'move';
    
    const lineShape = shape as Shape & { points: Point[] };
    if (!lineShape.points || lineShape.points.length < 2) return 'move';
    
    const startPoint = lineShape.points[0];
    const endPoint = lineShape.points[lineShape.points.length - 1];
    const lineLength = distance(startPoint, endPoint);
    
    // Threshold for endpoint detection (15px or 10% of line length, whichever is smaller)
    const threshold = Math.min(15, lineLength * 0.1);
    
    const distanceToStart = distance(mousePoint, startPoint);
    const distanceToEnd = distance(mousePoint, endPoint);
    
    if (distanceToStart <= threshold) {
      return 'resize-start';
    } else if (distanceToEnd <= threshold) {
      return 'resize-end';
    } else {
      return 'move';
    }
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
      height
    };
  };

  const handleShapeClick = (shape: Shape, position: Point) => {
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Handle different tools
    switch (currentTool) {
      case 'select':
        // Only allow editing when in select mode
        if (selectedShapeId === shape.id) {
          // If already selected, open label editor
          setEditingShape(shape);
        } else {
          // Select the shape
          setSelectedShapeId(shape.id);
        }
        break;
      case 'eraser':
        // Delete the shape when in eraser mode
        if (onDeleteShape) {
          console.log('🗑️ Deleting shape in eraser mode:', shape.id);
          onDeleteShape(shape.id);
        }
        break;
      default:
        // For other tools (draw, text), just select the shape
        setSelectedShapeId(shape.id);
        break;
    }
  };
  
  const handleLabelSave = (shapeId: string, label: string) => {
    if (onUpdateLabel) {
      onUpdateLabel(shapeId, label);
    }
    setEditingShape(null);
  };
  
  const handleLabelCancel = () => {
    setEditingShape(null);
  };
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle canvas clicks if we're not clicking on a shape
    if (e.target === e.currentTarget) {
      setSelectedShapeId(undefined);
      setEditingShape(null);
    }
  };
  
  // Double-click handler for shapes (works in any mode)
  const handleShapeDoubleClick = (shape: Shape) => {
    console.log('🖱️ Double-click detected, canceling drag timeout');
    // Cancel the drag timeout to prevent drag from starting
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setEditingShape(shape);
  };
  
  // Mouse down on shape: start dragging
  const handleShapeMouseDown = (shape: Shape, e: React.MouseEvent) => {
    console.log('🔍 Shape mouse down:', shape.id, shape.type);
    e.stopPropagation();
    
    // Clear any existing timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
    }
    
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const mousePoint = { x: mouseX, y: mouseY };
    
    // For lines, detect drag mode immediately
    if (shape.type === 'line') {
      const dragMode = detectLineDragMode(shape, mousePoint);
      console.log('📏 Line drag mode detected:', dragMode);
      setLineDragMode(dragMode);
      
      if (dragMode === 'resize-start' || dragMode === 'resize-end') {
        // For resizing, store the fixed point (the endpoint we're NOT dragging)
        const lineShape = shape as Shape & { points: Point[] };
        const fixedPoint = dragMode === 'resize-start' ? lineShape.points[lineShape.points.length - 1] : lineShape.points[0];
        setLineDragPoint(fixedPoint);
        console.log('📍 Fixed point for resizing:', fixedPoint);
      }
    }
    
    const center = getShapeCenter(shape);
    console.log('📍 Mouse position:', { mouseX, mouseY });
    console.log('🎯 Shape center:', center);
    
    // Delay drag start to allow double-click detection
    const timeout = setTimeout(() => {
      console.log('⏰ Starting drag after timeout');
      setDraggingShapeId(shape.id);
      setDragOffset({ x: mouseX - center.x, y: mouseY - center.y });
      console.log('📏 Drag offset set:', { x: mouseX - center.x, y: mouseY - center.y });
    }, 200); // 200ms delay to allow double-click
    
    setDragTimeout(timeout);
  };

  // Mouse move: if dragging, update shape position
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingShapeId || !dragOffset) {
      console.log('❌ Not dragging or no offset:', { draggingShapeId, dragOffset });
      return;
    }
    console.log('🔄 Mouse move while dragging:', draggingShapeId);
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      console.log('❌ Shape not found:', draggingShapeId);
      return;
    }
    const shape = shapes[idx];
    
    // Create updated shape for visual feedback
    const updatedShape = cloneDeep(shape);
    
    if (shape.type === 'line' && lineDragMode && lineDragPoint) {
      // Handle line resizing
      const snappedX = snapToGrid(mouseX, 20);
      const snappedY = snapToGrid(mouseY, 20);
      
      if (lineDragMode === 'resize-start') {
        // Move start point to mouse position, keep end point fixed
        (updatedShape as Shape & { points: Point[] }).points = [
          { x: snappedX, y: snappedY },
          lineDragPoint
        ];
        console.log('📏 Resizing line start:', { start: { x: snappedX, y: snappedY }, end: lineDragPoint });
      } else if (lineDragMode === 'resize-end') {
        // Move end point to mouse position, keep start point fixed
        (updatedShape as Shape & { points: Point[] }).points = [
          lineDragPoint,
          { x: snappedX, y: snappedY }
        ];
        console.log('📏 Resizing line end:', { start: lineDragPoint, end: { x: snappedX, y: snappedY } });
      } else {
        // Move entire line
        const center = getShapeCenter(shape);
        const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
        const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        const lineShape = shape as Shape & { points: Point[] };
        (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        console.log('📏 Moving entire line:', (updatedShape as Shape & { points: Point[] }).points);
      }
    } else {
      // Handle other shapes (normal dragging)
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      console.log('🎯 New center position:', { newCenterX, newCenterY });
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        console.log('❓ Invalid shape for switch');
        return;
      }
      switch ((shape as Shape).type) {
        case 'rectangle':
        case 'square':
        case 'diamond':
        case 'triangle': {
          const boxShape = shape as Shape & { x: number; y: number; width: number; height: number };
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX - boxShape.width / 2;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY - boxShape.height / 2;
          console.log('📦 Updated box shape position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'circle': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          console.log('⭕ Updated circle position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'arrow': {
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          (updatedShape as Shape & { from: Point; to: Point }).from = { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy };
          (updatedShape as Shape & { from: Point; to: Point }).to = { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy };
          console.log('➡️ Updated arrow position:', { from: (updatedShape as Shape & { from: Point; to: Point }).from, to: (updatedShape as Shape & { from: Point; to: Point }).to });
          break;
        }
        case 'text': {
          (updatedShape as Shape & { x: number; y: number }).x = newCenterX;
          (updatedShape as Shape & { x: number; y: number }).y = newCenterY;
          console.log('📝 Updated text position:', { x: (updatedShape as Shape & { x: number; y: number }).x, y: (updatedShape as Shape & { x: number; y: number }).y });
          break;
        }
        case 'line': {
          // Move all points by the delta
          const center = getShapeCenter(shape);
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          (updatedShape as Shape & { points: Point[] }).points = lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          console.log('📏 Updated line points (move):', (updatedShape as Shape & { points: Point[] }).points);
          break;
        }
        default:
          console.log('❓ Unknown shape type:', (shape as Shape).type);
          break;
      }
    }
    
    // Update the dragged shape for visual feedback
    setDraggedShape(updatedShape);
  };

  // Mouse up: stop dragging and update shape in state
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggingShapeId || !dragOffset) {
      console.log('❌ Mouse up but not dragging:', { draggingShapeId, dragOffset });
      return;
    }
    console.log('🛑 Mouse up - finishing drag for:', draggingShapeId);
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    const idx = shapes.findIndex(s => s.id === draggingShapeId);
    if (idx === -1) {
      console.log('❌ Shape not found in original shapes:', draggingShapeId);
      return;
    }
    const shape = shapes[idx];
    
    // Prepare updates based on shape type and drag mode
    let updates: Partial<Shape> = {};
    
    if (shape.type === 'line' && lineDragMode && lineDragPoint) {
      // Handle line resizing updates
      const snappedX = snapToGrid(mouseX, 20);
      const snappedY = snapToGrid(mouseY, 20);
      
      if (lineDragMode === 'resize-start') {
        updates = {
          points: [
            { x: snappedX, y: snappedY },
            lineDragPoint
          ]
        } as Partial<Shape & { points: Point[] }>;
        console.log('📏 Line resize-start updates:', updates);
      } else if (lineDragMode === 'resize-end') {
        updates = {
          points: [
            lineDragPoint,
            { x: snappedX, y: snappedY }
          ]
        } as Partial<Shape & { points: Point[] }>;
        console.log('📏 Line resize-end updates:', updates);
      } else {
        // Move entire line
        const center = getShapeCenter(shape);
        const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
        const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        const lineShape = shape as Shape & { points: Point[] };
        updates = {
          points: lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        } as Partial<Shape & { points: Point[] }>;
        console.log('📏 Line move updates:', updates);
      }
    } else {
      // Handle other shapes (normal dragging)
      const center = getShapeCenter(shape);
      const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
      const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
      console.log('🎯 Final position:', { newCenterX, newCenterY });
      
      // Defensive: ensure shape is valid
      if (!shape || typeof (shape as any).type !== 'string') {
        console.log('❓ Invalid shape for switch');
        return;
      }
      switch ((shape as Shape).type) {
        case 'rectangle':
        case 'square':
        case 'diamond':
        case 'triangle': {
          const boxShape = shape as Shape & { x: number; y: number; width: number; height: number };
          updates = {
            x: newCenterX - boxShape.width / 2,
            y: newCenterY - boxShape.height / 2
          } as Partial<Shape & { x: number; y: number }>;
          console.log('📦 Box shape updates:', updates);
          break;
        }
        case 'circle': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          console.log('⭕ Circle updates:', updates);
          break;
        }
        case 'arrow': {
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const arrowShape = shape as Shape & { from: Point; to: Point };
          updates = {
            from: { x: arrowShape.from.x + dx, y: arrowShape.from.y + dy },
            to: { x: arrowShape.to.x + dx, y: arrowShape.to.y + dy }
          } as Partial<Shape & { from: Point; to: Point }>;
          console.log('➡️ Arrow updates:', updates);
          break;
        }
        case 'text': {
          updates = {
            x: newCenterX,
            y: newCenterY
          } as Partial<Shape & { x: number; y: number }>;
          console.log('📝 Text updates:', updates);
          break;
        }
        case 'line': {
          // Move all points by the delta
          const dx = newCenterX - center.x;
          const dy = newCenterY - center.y;
          const lineShape = shape as Shape & { points: Point[] };
          updates = {
            points: lineShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          } as Partial<Shape & { points: Point[] }>;
          console.log('📏 Line updates (move):', updates);
          break;
        }
        default:
          console.log('❓ Unknown shape type for updates:', (shape as Shape).type);
          break;
      }
    }
    
    // Update the shape in global state
    if (onUpdateShape && Object.keys(updates).length > 0) {
      console.log('💾 Calling onUpdateShape with:', { shapeId: draggingShapeId, updates });
      onUpdateShape(draggingShapeId, updates);
    } else {
      console.log('❌ No onUpdateShape function or no updates to apply');
    }
    
    setDraggingShapeId(null);
    setDragOffset(null);
    setDraggedShape(null);
    setLineDragMode(null);
    setLineDragPoint(null);
    
    // Clear any pending drag timeout
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    
    console.log('✅ Drag finished, state reset');
  };

  return (
    <div className="relative w-full h-full">
      <svg 
        width={width} 
        height={height}
        style={{ 
          backgroundColor: canvasSettings.background,
          touchAction: 'none'
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Render all shapes */}
        {shapesToRender.map(shape => renderShape(
          shape, 
          (s, pos) => { handleShapeClick(s, pos); },
          selectedShapeId,
          editingShape ? editingShape.id : undefined,
          handleShapeDoubleClick,
          handleShapeMouseDown,
          currentTool
        ))}
        
        {/* Render current drawing stroke */}
        {currentPoints.length > 1 && (
          <path
            d={`M ${currentPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={strokeColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}

        {/* Render label editor INSIDE the SVG */}
        {editingShape && (
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
          })()
        )}
      </svg>
    </div>
  );
};