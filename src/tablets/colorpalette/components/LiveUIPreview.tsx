import React, { useState } from 'react';
import { ColorInfo, UIPreviewMapping } from '../types';
import { Star, Heart, ShoppingCart } from '../../../components/Icons';

interface LiveUIPreviewProps {
  colors: ColorInfo[];
  mapping: UIPreviewMapping;
  onMappingChange: (mapping: UIPreviewMapping) => void;
}

export const LiveUIPreview: React.FC<LiveUIPreviewProps> = ({
  colors,
  mapping,
  onMappingChange,
}) => {
  const [draggedColor, setDraggedColor] = useState<string | null>(null);

  const handleDragStart = (color: string) => {
    setDraggedColor(color);
  };

  const handleDragEnd = () => {
    setDraggedColor(null);
  };

  const handleDrop = (target: keyof UIPreviewMapping) => {
    if (draggedColor) {
      onMappingChange({
        ...mapping,
        [target]: draggedColor,
      });
    }
  };

  const ColorSwatch: React.FC<{ color: ColorInfo }> = ({ color }) => (
    <div
      className="w-8 h-8 rounded border border-gray-600 cursor-grab active:cursor-grabbing shadow-sm"
      style={{ backgroundColor: color.hex }}
      draggable
      onDragStart={() => handleDragStart(color.hex)}
      onDragEnd={handleDragEnd}
      title={`Drag ${color.hex} to UI elements`}
    />
  );

  const DropZone: React.FC<{
    target: keyof UIPreviewMapping;
    children: React.ReactNode;
    className?: string;
  }> = ({ target, children, className = '' }) => (
    <div
      className={`transition-all ${className} ${
        draggedColor ? 'ring-2 ring-blue-400/50 ring-offset-2 ring-offset-gray-800' : ''
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleDrop(target);
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Live UI Preview</h3>
        <div className="text-xs text-gray-500">Drag colors to elements</div>
      </div>

      {/* Color Swatches */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        {colors.map((color, index) => (
          <ColorSwatch key={index} color={color} />
        ))}
      </div>

      {/* UI Preview */}
      <div className="space-y-4">
        {/* Card Component Preview */}
        <DropZone target="background" className="rounded-lg p-4" style={{ backgroundColor: mapping.background }}>
          <div className="space-y-3">
            <DropZone target="text">
              <h3 className="text-lg font-semibold" style={{ color: mapping.text }}>
                Product Card
              </h3>
            </DropZone>
            
            <DropZone target="secondary">
              <p className="text-sm" style={{ color: mapping.secondary }}>
                This is a sample description that shows how your color palette works in a real UI context.
              </p>
            </DropZone>
            
            <div className="flex items-center justify-between">
              <DropZone target="accent">
                <div className="flex items-center space-x-1" style={{ color: mapping.accent }}>
                  <Star size={16} />
                  <span className="text-sm font-medium">4.8 Rating</span>
                </div>
              </DropZone>
              
              <DropZone target="primary">
                <button
                  className="px-4 py-2 rounded font-medium text-sm transition-colors flex items-center space-x-2"
                  style={{ 
                    backgroundColor: mapping.primary,
                    color: mapping.background,
                    border: `1px solid ${mapping.border}`,
                  }}
                >
                  <ShoppingCart size={16} />
                  <span>Add to Cart</span>
                </button>
              </DropZone>
            </div>
          </div>
        </DropZone>

        {/* Navigation Preview */}
        <DropZone target="background" className="rounded-lg" style={{ backgroundColor: mapping.background }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${mapping.border}` }}>
            <DropZone target="text">
              <h2 className="text-xl font-bold" style={{ color: mapping.text }}>
                Brand Name
              </h2>
            </DropZone>
            
            <div className="flex items-center space-x-4">
              <DropZone target="secondary">
                <span className="text-sm" style={{ color: mapping.secondary }}>
                  Home
                </span>
              </DropZone>
              <DropZone target="secondary">
                <span className="text-sm" style={{ color: mapping.secondary }}>
                  About
                </span>
              </DropZone>
              <DropZone target="primary">
                <button
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ 
                    backgroundColor: mapping.primary,
                    color: mapping.background,
                  }}
                >
                  Contact
                </button>
              </DropZone>
            </div>
          </div>
        </DropZone>

        {/* Form Preview */}
        <DropZone target="background" className="rounded-lg p-4 space-y-3" style={{ backgroundColor: mapping.background }}>
          <DropZone target="text">
            <label className="block text-sm font-medium" style={{ color: mapping.text }}>
              Email Address
            </label>
          </DropZone>
          
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-3 py-2 rounded text-sm"
            style={{ 
              backgroundColor: mapping.background,
              color: mapping.text,
              border: `1px solid ${mapping.border}`,
            }}
            readOnly
          />
          
          <div className="flex items-center space-x-2">
            <DropZone target="accent">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded"
                  style={{ accentColor: mapping.accent }}
                  readOnly
                />
                <span className="text-sm" style={{ color: mapping.secondary }}>
                  Subscribe to newsletter
                </span>
              </div>
            </DropZone>
          </div>
          
          <DropZone target="primary">
            <button
              className="w-full px-4 py-2 rounded font-medium text-sm flex items-center justify-center space-x-2"
              style={{ 
                backgroundColor: mapping.primary,
                color: mapping.background,
              }}
            >
              <Heart size={16} />
              <span>Subscribe</span>
            </button>
          </DropZone>
        </DropZone>
      </div>

      {/* Color Mapping Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(mapping).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded border border-gray-600"
              style={{ backgroundColor: value }}
            />
            <span className="text-gray-400 capitalize">{key}</span>
            <span className="text-gray-500 font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};