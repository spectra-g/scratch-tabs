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
  const [dynamicSize, setDynamicSize] = useState({ width, height });


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

  // Auto-resize textarea and container
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate scrollHeight accurately
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.width = "auto";
      
      // Calculate dimensions based on content
      const scrollHeight = textareaRef.current.scrollHeight;
      const scrollWidth = textareaRef.current.scrollWidth;
      
      // Set minimum dimensions
      const minWidth = 100;
      const minHeight = 32;
      const padding = 20; // Extra padding for comfort
      
      // Calculate dynamic width based on content, with some limits
      const lines = label.split('\n');
      const maxLineLength = Math.max(...lines.map(line => line.length), 10);
      const estimatedWidth = Math.max(minWidth, Math.min(maxLineLength * 8 + padding, 400));
      
      // Update dynamic size
      const newWidth = Math.max(estimatedWidth, scrollWidth + padding);
      const newHeight = Math.max(minHeight, scrollHeight + 10);
      
      setDynamicSize({ 
        width: newWidth, 
        height: newHeight 
      });
      
      // Apply the calculated height to the textarea
      textareaRef.current.style.height = `${newHeight}px`;
      textareaRef.current.style.width = `${newWidth}px`;
    }
  }, [label]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      // Shift+Enter saves the text
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter") {
      // Regular Enter allows new line (default textarea behavior)
      // Don't prevent default, let the textarea handle it
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    
    // Don't save if the text is still the default placeholder
    if (trimmedLabel === "Enter text") {
      onCancel();
      return;
    }
    
    // Don't save if the text is empty
    if (trimmedLabel === "") {
      onCancel();
      return;
    }
    
    onSave(shape.id, trimmedLabel);
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

  // Center the editor around the provided coordinates (shape center or double-click position)
  let editorX = x - dynamicSize.width / 2;
  let editorY = y - dynamicSize.height / 2;
  
  // Basic bounds checking to prevent going completely off screen
  editorX = Math.max(5, editorX);
  editorY = Math.max(5, editorY);

  return (
    <foreignObject
      x={editorX}
      y={editorY}
      width={dynamicSize.width}
      height={dynamicSize.height}
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
        placeholder="Enter text"
        style={{
          color: textColor,
          backgroundColor,
          border: `2px solid ${borderColor}`,
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
