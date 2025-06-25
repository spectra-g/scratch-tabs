import React, { useState, useEffect, useRef } from 'react';
import { Shape } from '../types';

interface ShapeLabelEditorProps {
  shape: Shape;
  onSave: (shapeId: string, label: string) => void;
  onCancel: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
  canvasMode: 'dark' | 'light';
}

export const ShapeLabelEditor: React.FC<ShapeLabelEditorProps> = ({
  shape,
  onSave,
  onCancel,
  x,
  y,
  width,
  height,
  canvasMode
}) => {
  const [label, setLabel] = useState(shape.label || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-focus and select text on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [label]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
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
    setTimeout(() => {
      handleSave();
    }, 100);
  };
  
  const textColor = canvasMode === 'dark' ? '#ffffff' : '#000000';
  const backgroundColor = canvasMode === 'dark' ? '#23272f' : '#f5f5f5';
  const borderColor = canvasMode === 'dark' ? '#3b82f6' : '#2563eb';
  
  return (
    <foreignObject
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      style={{ pointerEvents: 'auto', zIndex: 100 }}
    >
      <textarea
        ref={textareaRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Enter label..."
        style={{
          color: textColor,
          backgroundColor,
          border: `2px solid ${borderColor}`,
          minHeight: 32,
          maxHeight: 120,
          width: '100%',
          height: '100%',
          resize: 'none',
          borderRadius: 8,
          padding: 6,
          fontSize: 15,
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          overflowY: 'auto',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          fontWeight: 500,
          boxShadow: `0 0 0 2px ${borderColor}33`,
        }}
        rows={1}
      />
    </foreignObject>
  );
}; 