import React, { useState, useEffect, useRef } from "react";
import { Shape } from "../types";

interface ShapeLabelEditorProps {
  shape: Shape;
  onSave: (shapeId: string, label: string) => void;
  onCancel: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
  canvasMode: "dark" | "light";
}

export const ShapeLabelEditor: React.FC<ShapeLabelEditorProps> = ({
  shape,
  onSave,
  onCancel,
  x,
  y,
  width,
  height,
  canvasMode,
}) => {
  const [label, setLabel] = useState(() => {
    // For text shapes, use the 'text' property; for others, use the 'label' property
    if (shape.type === "text") {
      return (shape as any).text || "";
    } else {
      return shape.label || "";
    }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasUserFocused, setHasUserFocused] = useState(false);


  // Auto-focus and select text on mount
  useEffect(() => {
    if (textareaRef.current) {
      // Use setTimeout to ensure the component is fully mounted before focusing
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
          // Set the flag to indicate the user has now focused the textarea
          setHasUserFocused(true);
        }
      }, 10);
    }
  }, [shape.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSave = () => {
    onSave(shape.id, label.trim());
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleBlur = () => {
    // Only handle blur if the user has actually focused the textarea
    // This prevents the blur from firing immediately on mount
    if (hasUserFocused) {
      setTimeout(() => {
        handleSave();
      }, 100);
    }
  };

  const textColor = canvasMode === "dark" ? "#ffffff" : "#000000";
  const backgroundColor = canvasMode === "dark" ? "#23272f" : "#f5f5f5";
  const borderColor = canvasMode === "dark" ? "#3b82f6" : "#2563eb";

  const handleTextareaClick = (e: React.MouseEvent) => {
    // Prevent click from bubbling up to the canvas
    e.stopPropagation();
  };

  const handleTextareaMouseDown = (e: React.MouseEvent) => {
    // Prevent mousedown from bubbling up to the canvas
    e.stopPropagation();
  };

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      style={{ pointerEvents: "auto", zIndex: 100 }}
    >
      <textarea
        ref={textareaRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => setHasUserFocused(true)}
        onClick={handleTextareaClick}
        onMouseDown={handleTextareaMouseDown}
        placeholder="Enter label..."
        style={{
          color: textColor,
          backgroundColor,
          border: `2px solid ${borderColor}`,
          minHeight: 32,
          maxHeight: 120,
          width: "100%",
          height: "100%",
          resize: "none",
          borderRadius: 8,
          padding: 6,
          fontSize: 15,
          textAlign: "center",
          outline: "none",
          boxSizing: "border-box",
          overflow: "hidden",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
          fontWeight: 500,
          boxShadow: `0 0 0 2px ${borderColor}33`,
        }}
        rows={1}
      />
    </foreignObject>
  );
};
