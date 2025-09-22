import React, { useState } from 'react';
import { Copy, Check, Trash2, Plus } from '../../../components/Icons';
import { ColorInfo } from '../types';
import { createColorInfo, isValidHexColor } from '../utils/colourUtils';

interface PaletteDisplayProps {
  colors: ColorInfo[];
  activeColorIndex: number;
  onColorsChange: (colors: ColorInfo[]) => void;
  onActiveColorChange: (index: number) => void;
}

export const PaletteDisplay: React.FC<PaletteDisplayProps> = ({
  colors,
  activeColorIndex,
  onColorsChange,
  onActiveColorChange,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleCopyColor = async (color: ColorInfo, index: number) => {
    try {
      await navigator.clipboard.writeText(color.hex);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Silently fail if clipboard access is denied
    }
  };

  const handleEditColor = (index: number) => {
    setEditingIndex(index);
    setEditValue(colors[index].hex);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    if (isValidHexColor(editValue)) {
      const newColors = [...colors];
      newColors[editingIndex] = createColorInfo(editValue);
      onColorsChange(newColors);
    }
    
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleDeleteColor = (index: number) => {
    if (colors.length <= 1) return;
    
    const newColors = colors.filter((_, i) => i !== index);
    onColorsChange(newColors);
    
    // Adjust active index if necessary
    if (activeColorIndex >= newColors.length) {
      onActiveColorChange(newColors.length - 1);
    } else if (activeColorIndex > index) {
      onActiveColorChange(activeColorIndex - 1);
    }
  };

  const handleAddColor = () => {
    const newColor = createColorInfo('#808080');
    onColorsChange([...colors, newColor]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Colour Palette</h3>
        <button
          onClick={handleAddColor}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title="Add color"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {colors.map((color, index) => (
          <div
            key={index}
            className={`group relative border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
              activeColorIndex === index
                ? 'border-blue-400 shadow-lg shadow-blue-500/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => onActiveColorChange(index)}
          >
            {/* Color Swatch */}
            <div
              className="h-16 w-full"
              style={{ backgroundColor: color.hex }}
            />
            
            {/* Color Info */}
            <div className="p-3 bg-gray-800">
              {editingIndex === index ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-200"
                  autoFocus
                />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-200">{color.hex}</span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyColor(color, index);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                        title="Copy hex"
                      >
                        {copiedIndex === index ? (
                          <Check size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      {colors.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteColor(index);
                          }}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete color"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                  </div>
                  <div className="text-xs text-gray-400">
                    HSL({color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%)
                  </div>
                  {color.name && (
                    <div className="text-xs text-gray-500 capitalize">{color.name}</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Edit overlay */}
            <div
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleEditColor(index);
              }}
            >
              <span className="text-white text-xs font-medium">Edit</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};