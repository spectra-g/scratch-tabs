import React, { useState } from 'react';
import { 
  Pencil, 
  MousePointer, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Download, 
  Sun, 
  Moon, 
  Magnet,
  Signature
} from 'lucide-react';
import { ShapeSnapTool, ShapeSnapMode } from '../types';

interface ShapeSnapToolbarProps {
  currentTool: ShapeSnapTool;
  canvasMode: ShapeSnapMode;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ShapeSnapTool) => void;
  onModeChange: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  gridSnappingEnabled: boolean;
  onToggleGridSnapping: () => void;
  sketchModeEnabled: boolean;
  onToggleSketchMode: () => void;
}

export const ShapeSnapToolbar: React.FC<ShapeSnapToolbarProps> = ({
  currentTool,
  canvasMode,
  canUndo,
  canRedo,
  onToolChange,
  onModeChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  gridSnappingEnabled,
  onToggleGridSnapping,
  sketchModeEnabled,
  onToggleSketchMode
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const handleDrawToggle = () => {
    // Toggle between 'draw' and 'select' modes
    const newTool = currentTool === 'draw' ? 'select' : 'draw';
    onToolChange(newTool);
  };
  
  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center space-x-1">
        {/* Draw/Select toggle button */}
        <button
          className={`p-2 rounded-md transition-colors ${
            currentTool === 'draw' 
              ? 'bg-blue-500/20 text-blue-400' 
              : currentTool === 'select'
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          onClick={handleDrawToggle}
          title={currentTool === 'draw' ? 'Draw Mode (Click to switch to Select)' : 'Select Mode (Click to switch to Draw)'}
        >
          {currentTool === 'draw' ? <Pencil size={18} /> : <MousePointer size={18} />}
        </button>
        
        {/* Eraser tool */}
        <button
          className={`p-2 rounded-md transition-colors ${
            currentTool === 'eraser' 
              ? 'bg-red-500/20 text-red-400' 
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          onClick={() => onToolChange('eraser')}
          title="Eraser"
        >
          <Eraser size={18} />
        </button>
        
        <button
          className={`p-2 rounded-md transition-colors ${
            gridSnappingEnabled ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          onClick={onToggleGridSnapping}
          title={gridSnappingEnabled ? 'Disable Grid Snapping' : 'Enable Grid Snapping'}
        >
          <Magnet size={18} />
        </button>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          className={`p-2 rounded-md transition-colors ${
            canUndo ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300' : 'text-gray-600 cursor-not-allowed'
          }`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <RotateCcw size={18} />
        </button>
        
        <button
          className={`p-2 rounded-md transition-colors ${
            canRedo ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300' : 'text-gray-600 cursor-not-allowed'
          }`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <RotateCw size={18} />
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1"></div>
        
        <button
          className={`p-2 rounded-md transition-colors ${
            sketchModeEnabled ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          }`}
          onClick={onToggleSketchMode}
          title={sketchModeEnabled ? 'Disable Sketch Mode' : 'Enable Sketch Mode'}
        >
          <Signature size={18} />
        </button>
        
        <button
          className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
          onClick={onModeChange}
          title={canvasMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {canvasMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1"></div>
        
        <button
          className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
          onClick={onClear}
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>
        
        <div className="relative">
          <button
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            onClick={() => setShowExportOptions(!showExportOptions)}
            title="Export"
          >
            <Download size={18} />
          </button>
          
          {showExportOptions && (
            <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                onClick={() => {
                  onExport();
                  setShowExportOptions(false);
                }}
              >
                Export as PNG
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};