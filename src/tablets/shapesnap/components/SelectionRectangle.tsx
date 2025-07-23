import React from "react";
import { SelectionRectangle as SelectionRectangleType } from "../hooks/useSelectionRectangle";

interface SelectionRectangleProps {
  selectionRectangle: SelectionRectangleType;
  canvasMode: "light" | "dark";
}

export const SelectionRectangle: React.FC<SelectionRectangleProps> = ({
  selectionRectangle,
  canvasMode,
}) => {
  if (!selectionRectangle.isActive) {
    return null;
  }

  const { startPoint, endPoint } = selectionRectangle;
  
  // Calculate rectangle properties
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  // Style based on canvas mode
  const strokeColor = canvasMode === "dark" ? "#60a5fa" : "#2563eb"; // blue-400 : blue-600
  const fillColor = canvasMode === "dark" ? "rgba(96, 165, 250, 0.1)" : "rgba(37, 99, 235, 0.1)";

  return (
    <g>
      <rect
        data-testid="selection-rectangle"
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1}
        strokeDasharray="4,2"
        pointerEvents="none"
      />
    </g>
  );
};