import React from "react";
import { ShapeSnapTool, ShapeSnapMode } from "../types";
import { useTabletDeviceInfo } from "../../bridge";

interface ShapeSnapStatusBarProps {
  shapeCount: number;
  currentTool: ShapeSnapTool;
  canvasMode: ShapeSnapMode;
  selectedCount?: number;
  hasClipboard?: boolean;
}

export const ShapeSnapStatusBar: React.FC<ShapeSnapStatusBarProps> = ({
  shapeCount,
  currentTool,
  canvasMode,
  selectedCount = 0,
  hasClipboard = false,
}) => {
  const { isMobile } = useTabletDeviceInfo();
  return (
    <div className="flex items-center justify-between p-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
      <div className="flex items-center space-x-4">
        <div>
          {shapeCount} {shapeCount === 1 ? "shape" : "shapes"}
        </div>

        {selectedCount > 0 && (
          <div className="text-blue-400">{selectedCount} selected</div>
        )}

        {hasClipboard && <div className="text-green-400">Clipboard ready</div>}
      </div>

      <div className="flex items-center space-x-4">
        <div>
          Tool: <span className="text-gray-300 capitalize">{currentTool}</span>
        </div>

        <div>
          Mode: <span className="text-gray-300 capitalize">{canvasMode}</span>
        </div>

        {!isMobile && (
          <div className="text-gray-500 text-xs">
            Ctrl+C Copy | Ctrl+V Paste | Ctrl+X Cut | Del Delete
          </div>
        )}
      </div>
    </div>
  );
};
