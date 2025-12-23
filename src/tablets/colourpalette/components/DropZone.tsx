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
    className={`transition-all ${className} ${isDragActive ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-surface' : ''
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