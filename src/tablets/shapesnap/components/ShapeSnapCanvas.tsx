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
  onUpdateShape?: (shapeId: string, updates: any) => void;
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
  const [editorPosition, setEditorPosition] = useState<Point>({ x: 0, y: 0 });
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  
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
          setEditorPosition(position);
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
  const handleShapeDoubleClick = (shape: Shape, _position: Point) => {
    console.log('🖱️ Double-click detected, canceling drag timeout');
    // Cancel the drag timeout to prevent drag from starting
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
    setEditingShape(shape);
  };
  
  // Helper to get editor size for a shape
  const getEditorRect = (shape: Shape) => {
    switch (shape.type) {
      case 'rectangle':
      case 'square':
      case 'diamond':
      case 'triangle':
        return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2, width: Math.max(80, shape.width * 0.8), height: Math.max(40, shape.height * 0.4) };
      case 'circle':
        return { x: shape.x, y: shape.y, width: Math.max(80, shape.radius * 1.5), height: Math.max(40, shape.radius * 0.8) };
      case 'line': {
        const center = getShapeCenter(shape);
        return { x: center.x, y: center.y, width: 100, height: 40 };
      }
      case 'arrow': {
        const center = getShapeCenter(shape);
        return { x: center.x, y: center.y, width: 100, height: 40 };
      }
      case 'text':
        return { x: shape.x, y: shape.y, width: 120, height: 40 };
      default:
        return { x: 0, y: 0, width: 100, height: 40 };
    }
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
    const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
    const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
    console.log('🎯 New center position:', { newCenterX, newCenterY });
    
    // Create updated shape for visual feedback
    const updatedShape = cloneDeep(shape);
    switch (shape.type) {
      case 'rectangle':
      case 'square':
      case 'diamond':
      case 'triangle':
        (updatedShape as any).x = newCenterX - (shape as any).width / 2;
        (updatedShape as any).y = newCenterY - (shape as any).height / 2;
        console.log('📦 Updated box shape position:', { x: (updatedShape as any).x, y: (updatedShape as any).y });
        break;
      case 'circle':
        (updatedShape as any).x = newCenterX;
        (updatedShape as any).y = newCenterY;
        console.log('⭕ Updated circle position:', { x: (updatedShape as any).x, y: (updatedShape as any).y });
        break;
      case 'line': {
        // Move all points by the delta
        const center = getShapeCenter(shape);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        (updatedShape as any).points = (shape as any).points.map((p: any) => ({ x: p.x + dx, y: p.y + dy }));
        console.log('📏 Updated line points:', (updatedShape as any).points);
        break;
      }
      case 'arrow': {
        const center = getShapeCenter(shape);
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        (updatedShape as any).from = { x: (shape as any).from.x + dx, y: (shape as any).from.y + dy };
        (updatedShape as any).to = { x: (shape as any).to.x + dx, y: (shape as any).to.y + dy };
        console.log('➡️ Updated arrow position:', { from: (updatedShape as any).from, to: (updatedShape as any).to });
        break;
      }
      case 'text':
        (updatedShape as any).x = newCenterX;
        (updatedShape as any).y = newCenterY;
        console.log('📝 Updated text position:', { x: (updatedShape as any).x, y: (updatedShape as any).y });
        break;
      default:
        console.log('❓ Unknown shape type:', shape.type);
        break;
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
    const center = getShapeCenter(shape);
    const newCenterX = snapToGrid(mouseX - dragOffset.x, 20);
    const newCenterY = snapToGrid(mouseY - dragOffset.y, 20);
    console.log('🎯 Final position:', { newCenterX, newCenterY });
    
    // Prepare updates based on shape type
    let updates: any = {};
    switch (shape.type) {
      case 'rectangle':
      case 'square':
      case 'diamond':
      case 'triangle':
        updates = {
          x: newCenterX - (shape as any).width / 2,
          y: newCenterY - (shape as any).height / 2
        };
        console.log('📦 Box shape updates:', updates);
        break;
      case 'circle':
        updates = {
          x: newCenterX,
          y: newCenterY
        };
        console.log('⭕ Circle updates:', updates);
        break;
      case 'line': {
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        updates = {
          points: (shape as any).points.map((p: any) => ({ x: p.x + dx, y: p.y + dy }))
        };
        console.log('📏 Line updates:', updates);
        break;
      }
      case 'arrow': {
        const dx = newCenterX - center.x;
        const dy = newCenterY - center.y;
        updates = {
          from: { x: (shape as any).from.x + dx, y: (shape as any).from.y + dy },
          to: { x: (shape as any).to.x + dx, y: (shape as any).to.y + dy }
        };
        console.log('➡️ Arrow updates:', updates);
        break;
      }
      case 'text':
        updates = {
          x: newCenterX,
          y: newCenterY
        };
        console.log('📝 Text updates:', updates);
        break;
      default:
        console.log('❓ Unknown shape type for updates:', shape.type);
        break;
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