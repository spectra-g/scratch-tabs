import React from 'react';
import { CanvasSettings, Shape, Point } from '../types';
import { renderShape } from '../utils/renderUtils';

interface ShapeSnapCanvasProps {
  shapes: Shape[];
  canvasSettings: CanvasSettings;
  currentPoints: Point[];
  width: number;
  height: number;
}

export const ShapeSnapCanvas: React.FC<ShapeSnapCanvasProps> = ({
  shapes,
  canvasSettings,
  currentPoints,
  width,
  height
}) => {
  // Sort shapes by zIndex for proper rendering order
  const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
  
  // Determine stroke color based on canvas mode
  const strokeColor = canvasSettings.mode === 'dark' ? '#ffffff' : '#000000';
  
  return (
    <svg 
      width={width} 
      height={height}
      style={{ 
        backgroundColor: canvasSettings.background,
        touchAction: 'none'
      }}
    >
      {/* Render all shapes */}
      {sortedShapes.map(shape => renderShape(shape))}
      
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
    </svg>
  );
};