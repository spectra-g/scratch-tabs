import React from 'react';
import { ShapeSnapTool, ShapeSnapMode } from '../types';

interface ShapeSnapStatusBarProps {
  shapeCount: number;
  currentTool: ShapeSnapTool;
  canvasMode: ShapeSnapMode;
}

export const ShapeSnapStatusBar: React.FC<ShapeSnapStatusBarProps> = ({
  shapeCount,
  currentTool,
  canvasMode
}) => {
  return (
    <div className="flex items-center justify-between p-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
      <div>
        {shapeCount} {shapeCount === 1 ? 'shape' : 'shapes'}
      </div>
      
      <div className="flex items-center space-x-4">
        <div>
          Tool: <span className="text-gray-300 capitalize">{currentTool}</span>
        </div>
        
        <div>
          Mode: <span className="text-gray-300 capitalize">{canvasMode}</span>
        </div>
      </div>
    </div>
  );
};