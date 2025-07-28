import React, { useState } from "react";
import {
  Pencil,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Sun,
  Moon,
  Magnet,
  Signature,
  Type,
  Layers,
  Grid3X3,
} from "lucide-react";
import { ShapeSnapTool, ShapeSnapMode } from "../types";
import { useTabletDeviceInfo } from "../../bridge";

type BackgroundMode = "notepad" | "none" | "dot-grid" | "graph-paper" | "isometric";

interface ShapeSnapToolbarProps {
  currentTool: ShapeSnapTool;
  canvasMode: ShapeSnapMode;
  canUndo: boolean;
  canRedo: boolean;
  currentFontSize: number;
  onToolChange: (tool: ShapeSnapTool) => void;
  onModeChange: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onCycleFontSize: () => void;
  gridSnappingEnabled: boolean;
  onToggleGridSnapping: () => void;
  sketchModeEnabled: boolean;
  onToggleSketchMode: () => void;
  backgroundMode: BackgroundMode;
  onToggleBackgroundMode: () => void;
  onToggleTemplates: () => void;
}

export const ShapeSnapToolbar: React.FC<ShapeSnapToolbarProps> = ({
  currentTool,
  canvasMode,
  canUndo,
  canRedo,
  currentFontSize,
  onToolChange,
  onModeChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onCycleFontSize,
  gridSnappingEnabled,
  onToggleGridSnapping,
  sketchModeEnabled,
  onToggleSketchMode,
  backgroundMode,
  onToggleBackgroundMode,
  onToggleTemplates,
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const { isMobile } = useTabletDeviceInfo();

  const handleDrawToggle = () => {
    // Toggle between 'draw' and 'select' modes
    const newTool = currentTool === "draw" ? "select" : "draw";
    onToolChange(newTool);
  };

  return (
    <div className={`flex items-center justify-between border-b border-gray-700 bg-gray-800 ${
      isMobile ? "p-1" : "p-2"
    }`}>
      <div className={`flex items-center ${
        isMobile ? "space-x-0.5" : "space-x-1"
      }`}>
        {/* Draw/Select toggle button */}
        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors ${
            currentTool === "draw"
              ? "bg-blue-500/20 text-blue-400"
              : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
          }`}
          onClick={handleDrawToggle}
          title={
            currentTool === "draw"
              ? "Draw Mode (Click for Select Mode)"
              : "Select Mode (Click for Draw Mode)"
          }
        >
          <Pencil size={isMobile ? 16 : 18} />
        </button>

        {/* Eraser tool */}
        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors ${
            currentTool === "eraser"
              ? "bg-red-500/20 text-red-400"
              : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
          }`}
          onClick={() => onToolChange("eraser")}
          title="Eraser"
        >
          <Eraser size={isMobile ? 16 : 18} />
        </button>

        {!isMobile && (
          <button
            className={`p-2 rounded-md transition-colors ${
              gridSnappingEnabled
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            }`}
            onClick={onToggleGridSnapping}
            title={
              gridSnappingEnabled
                ? "Disable Grid Snapping"
                : "Enable Grid Snapping"
            }
          >
            <Magnet size={18} />
          </button>
        )}

        {/* Font Size Button */}
        {!isMobile && (
          <button
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 flex items-center gap-1"
            onClick={onCycleFontSize}
            title={`Font Size: ${currentFontSize}px (Click to cycle)`}
          >
            <Type size={16} />
            <span className="text-xs font-mono">{currentFontSize}</span>
          </button>
        )}
      </div>

      {/* Instructional Text - Hidden on mobile */}
      {!isMobile && (
        <div className="flex items-center px-3">
          <span className="text-sm text-gray-400 font-medium">
            Draw freely and Shape Snap will auto detect and correct
          </span>
        </div>
      )}

      <div className={`flex items-center ${
        isMobile ? "space-x-0.5" : "space-x-1"
      }`}>
        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors ${
            canUndo
              ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              : "text-gray-600 cursor-not-allowed"
          }`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <RotateCcw size={isMobile ? 16 : 18} />
        </button>

        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors ${
            canRedo
              ? "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
              : "text-gray-600 cursor-not-allowed"
          }`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <RotateCw size={isMobile ? 16 : 18} />
        </button>

        <div className="w-px h-6 bg-gray-700 mx-1"></div>

        {!isMobile && (
          <button
            className={`p-2 rounded-md transition-colors ${
              sketchModeEnabled
                ? "bg-blue-500/20 text-blue-400"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            }`}
            onClick={onToggleSketchMode}
            title={
              sketchModeEnabled ? "Disable Sketch Mode" : "Enable Sketch Mode"
            }
          >
            <Signature size={18} />
          </button>
        )}

        {!isMobile && (
          <button
            className={`p-2 rounded-md transition-colors ${
              backgroundMode !== "none"
                ? "bg-green-500/20 text-green-400"
                : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            }`}
            onClick={onToggleBackgroundMode}
            title={`Background: ${backgroundMode === "notepad" ? "Notepad" : 
                                backgroundMode === "none" ? "None" : 
                                backgroundMode === "dot-grid" ? "Dot Grid" : 
                                backgroundMode === "graph-paper" ? "Graph Paper" : 
                                "Isometric"}`}
          >
            <Grid3X3 size={18} />
          </button>
        )}

        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300`}
          onClick={onModeChange}
          title={
            canvasMode === "dark"
              ? "Switch to Light Mode"
              : "Switch to Dark Mode"
          }
        >
          {canvasMode === "dark" ? <Sun size={isMobile ? 16 : 18} /> : <Moon size={isMobile ? 16 : 18} />}
        </button>

        <div className="w-px h-6 bg-gray-700 mx-1"></div>

        {!isMobile && (
          <button
            className="p-2 rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300"
            onClick={onToggleTemplates}
            title="Templates"
          >
            <Layers size={18} />
          </button>
        )}

        <button
          className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300`}
          onClick={onClear}
          title="Clear Canvas"
        >
          <Trash2 size={isMobile ? 16 : 18} />
        </button>

        <div className="relative">
          <button
            className={`${isMobile ? "p-1.5" : "p-2"} rounded-md transition-colors text-gray-400 hover:bg-gray-700/50 hover:text-gray-300`}
            onClick={() => setShowExportOptions(!showExportOptions)}
            title="Export"
          >
            <Download size={isMobile ? 16 : 18} />
          </button>

          {showExportOptions && (
            <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-max">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors whitespace-nowrap"
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
