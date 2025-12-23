import React from 'react';
import { ColorInfo } from '../types';

interface ColorSwatchProps {
  color: ColorInfo;
  onDragStart: (color: string) => void;
  onDragEnd: () => void;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  onDragStart,
  onDragEnd
}) => (
  <div
    className="w-8 h-8 rounded border border-base cursor-grab active:cursor-grabbing shadow-sm"
    style={{ backgroundColor: color.hex }}
    draggable
    onDragStart={() => onDragStart(color.hex)}
    onDragEnd={onDragEnd}
    title={`Drag ${color.hex} to UI elements`}
  />
);