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
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);

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

  // Different mapping presets for cycling through
  const generateMappingPresets = (colors: ColorInfo[]): UIPreviewMapping[] => {
    if (colors.length === 0) return [mapping];

    const presets: UIPreviewMapping[] = [
      // Preset 1: Light theme with first color as background
      {
        background: colors[0]?.hex || '#FFFFFF',
        text: colors[colors.length - 1]?.hex || '#1F2937',
        primary: colors[1]?.hex || '#3B82F6',
        secondary: colors[2]?.hex || '#6B7280',
        accent: colors[3]?.hex || '#10B981',
        border: colors[4]?.hex || '#E5E7EB',
      },
      // Preset 2: Dark theme with last color as background
      {
        background: colors[colors.length - 1]?.hex || '#1F2937',
        text: colors[0]?.hex || '#FFFFFF',
        primary: colors[Math.floor(colors.length / 2)]?.hex || '#60A5FA',
        secondary: colors[1]?.hex || '#9CA3AF',
        accent: colors[colors.length - 2]?.hex || '#34D399',
        border: colors[2]?.hex || '#374151',
      },
      // Preset 3: Vibrant theme with middle colors prominent
      {
        background: colors[Math.floor(colors.length / 2)]?.hex || '#F9FAFB',
        text: colors[colors.length - 1]?.hex || '#111827',
        primary: colors[0]?.hex || '#EF4444',
        secondary: colors[colors.length - 2]?.hex || '#F59E0B',
        accent: colors[1]?.hex || '#8B5CF6',
        border: colors[3]?.hex || '#D1D5DB',
      },
      // Preset 4: Monochromatic with different saturations
      {
        background: colors[colors.length - 2]?.hex || '#F3F4F6',
        text: colors[colors.length - 1]?.hex || '#1F2937',
        primary: colors[0]?.hex || '#4F46E5',
        secondary: colors[1]?.hex || '#6366F1',
        accent: colors[2]?.hex || '#8B5CF6',
        border: colors[3]?.hex || '#C7D2FE',
      },
      // Preset 5: High contrast
      {
        background: colors[1]?.hex || '#FFFFFF',
        text: colors[colors.length - 1]?.hex || '#000000',
        primary: colors[0]?.hex || '#DC2626',
        secondary: colors[2]?.hex || '#525252',
        accent: colors[3]?.hex || '#059669',
        border: colors[4]?.hex || '#D4D4D4',
      },
    ];

    return presets;
  };

  const cycleMappingPreset = () => {
    const presets = generateMappingPresets(colors);
    const nextIndex = (currentPresetIndex + 1) % presets.length;
    setCurrentPresetIndex(nextIndex);
    onMappingChange(presets[nextIndex]);
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
    style?: React.CSSProperties;
  }> = ({ target, children, className = '', style }) => (
    <div
      className={`transition-all ${className} ${
        draggedColor ? 'ring-2 ring-blue-400/50 ring-offset-2 ring-offset-gray-800' : ''
      }`}
      style={style}
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
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-300">Live UI Preview</h3>
          {colors.length > 0 && (
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">
              Style {currentPresetIndex + 1}/5
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">Drag colors to elements</div>
      </div>

      {/* Color Swatches */}
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex flex-wrap gap-2 flex-1">
          {colors.map((color, index) => (
            <ColorSwatch key={index} color={color} />
          ))}
        </div>

        {colors.length > 0 && (
          <button
            onClick={cycleMappingPreset}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center space-x-1 whitespace-nowrap"
            title="Cycle through different color mapping styles"
          >
            <span>🔄</span>
            <span>Remix</span>
          </button>
        )}
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