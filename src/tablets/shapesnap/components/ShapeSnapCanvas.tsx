import React, { useState } from 'react';
import { CanvasSettings, Shape, Point, ShapeSnapTool } from '../types';
import { renderShape, getShapeCenter } from '../utils/renderUtils';
import { ShapeLabelEditor } from './ShapeLabelEditor';

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
  currentTool: ShapeSnapTool;
  onShapeClick?: (shape: Shape, position: Point) => void;
  onUpdateLabel?: (shapeId: string, label: string) => void;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height,
  currentTool,
  onShapeClick,
  onUpdateLabel
}) => {
  const [selectedShapeId, setSelectedShapeId] = useState<string | undefined>(undefined);
  const [editingShape, setEditingShape] = useState<Shape | null>(null);
  const [editorPosition, setEditorPosition] = useState<Point>({ x: 0, y: 0 });
  
  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
  
  const handleShapeClick = (shape: Shape, position: Point) => {
    if (onShapeClick) {
      onShapeClick(shape, position);
    }
    
    // Only allow editing when in select mode
    if (currentTool === 'select') {
      if (selectedShapeId === shape.id) {
        // If already selected, open label editor
        setEditingShape(shape);
        setEditorPosition(position);
      } else {
        // Select the shape
        setSelectedShapeId(shape.id);
      }
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
      >
        {/* Render all shapes */}
        {sortedShapes.map(shape => renderShape(
          shape, 
          currentTool === 'select' ? handleShapeClick : undefined, 
          selectedShapeId,
          editingShape ? editingShape.id : undefined
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