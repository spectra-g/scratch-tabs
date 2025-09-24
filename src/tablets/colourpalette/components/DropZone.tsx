import React from 'react';
import { UIPreviewMapping } from '../types';

interface DropZoneProps {
  target: keyof UIPreviewMapping;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  isDragActive: boolean;
  onDrop: (target: keyof UIPreviewMapping) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  target,
  children,
  className = '',
  style,
  isDragActive,
  onDrop,
}) => (
  <div
    className={`transition-all ${className} ${
      isDragActive ? 'ring-2 ring-blue-400/50 ring-offset-2 ring-offset-gray-800' : ''
    }`}
    style={style}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      onDrop(target);
    }}
  >
    {children}
  </div>
);