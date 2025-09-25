import React, { useState } from 'react';
import { ColorInfo, UIPreviewMapping } from '../types';
import { Star, Heart, ShoppingCart, Lock, Unlock } from '../../../components/Icons';
import { generateMappingPresets, applyPresetWithLocks } from '../utils/presetUtils';
import { ColorSwatch } from './ColorSwatch';
import { DropZone } from './DropZone';

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
  const [lockedElements, setLockedElements] = useState<Set<keyof UIPreviewMapping>>(new Set());

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

  const toggleLock = (element: keyof UIPreviewMapping) => {
    const newLockedElements = new Set(lockedElements);
    if (newLockedElements.has(element)) {
      newLockedElements.delete(element);
    } else {
      newLockedElements.add(element);
    }
    setLockedElements(newLockedElements);
  };


  const cycleMappingPreset = () => {
    const presets = generateMappingPresets(colors, mapping);
    const nextIndex = (currentPresetIndex + 1) % presets.length;
    setCurrentPresetIndex(nextIndex);

    const newMapping = presets[nextIndex];
    const finalMapping = applyPresetWithLocks(newMapping, mapping, lockedElements);

    onMappingChange(finalMapping);
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-300">Live UI Preview</h3>
          {colors.length > 0 && (
            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-400 rounded">
              Style {currentPresetIndex + 1}/8
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">Drag colors to elements</div>
      </div>

      {/* Color Swatches */}
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex flex-wrap gap-2 flex-1">
          {colors.map((color, index) => (
            <ColorSwatch
              key={index}
              color={color}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
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
        <DropZone target="background" className="rounded-lg p-4" style={{ backgroundColor: mapping.background }} isDragActive={!!draggedColor} onDrop={handleDrop}>
          <div className="space-y-3">
            <DropZone target="text" isDragActive={!!draggedColor} onDrop={handleDrop}>
              <h3 className="text-lg font-semibold" style={{ color: mapping.text }}>
                Product Card
              </h3>
            </DropZone>

            <DropZone target="secondary" isDragActive={!!draggedColor} onDrop={handleDrop}>
              <p className="text-sm" style={{ color: mapping.secondary }}>
                This is a sample description that shows how your colour palette works in a real UI context.
              </p>
            </DropZone>

            <div className="flex items-center justify-between">
              <DropZone target="accent" isDragActive={!!draggedColor} onDrop={handleDrop}>
                <div className="flex items-center space-x-1" style={{ color: mapping.accent }}>
                  <Star size={16} />
                  <span className="text-sm font-medium">4.8 Rating</span>
                </div>
              </DropZone>

              <DropZone target="primary" isDragActive={!!draggedColor} onDrop={handleDrop}>
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
        <DropZone target="background" className="rounded-lg" style={{ backgroundColor: mapping.background }} isDragActive={!!draggedColor} onDrop={handleDrop}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${mapping.border}` }}>
            <DropZone target="text" isDragActive={!!draggedColor} onDrop={handleDrop}>
              <h2 className="text-xl font-bold" style={{ color: mapping.text }}>
                Brand Name
              </h2>
            </DropZone>

            <div className="flex items-center space-x-4">
              <DropZone target="secondary" isDragActive={!!draggedColor} onDrop={handleDrop}>
                <span className="text-sm" style={{ color: mapping.secondary }}>
                  Home
                </span>
              </DropZone>
              <DropZone target="secondary" isDragActive={!!draggedColor} onDrop={handleDrop}>
                <span className="text-sm" style={{ color: mapping.secondary }}>
                  About
                </span>
              </DropZone>
              <DropZone target="primary" isDragActive={!!draggedColor} onDrop={handleDrop}>
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
        <DropZone target="background" className="rounded-lg p-4 space-y-3" style={{ backgroundColor: mapping.background }} isDragActive={!!draggedColor} onDrop={handleDrop}>
          <DropZone target="text" isDragActive={!!draggedColor} onDrop={handleDrop}>
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
            <DropZone target="accent" isDragActive={!!draggedColor} onDrop={handleDrop}>
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

          <DropZone target="primary" isDragActive={!!draggedColor} onDrop={handleDrop}>
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

      {/* Color Mapping Legend with Lock Controls */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-400">Color Assignments</h4>
        <div className="grid grid-cols-1 gap-2 text-xs">
          {Object.entries(mapping).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-700">
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded border border-gray-600"
                  style={{ backgroundColor: value }}
                />
                <span className="text-gray-300 capitalize font-medium">{key}</span>
                <span className="text-gray-500 font-mono">{value}</span>
              </div>

              <button
                onClick={() => toggleLock(key as keyof UIPreviewMapping)}
                className={`p-1 rounded transition-colors ${
                  lockedElements.has(key as keyof UIPreviewMapping)
                    ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                }`}
                title={
                  lockedElements.has(key as keyof UIPreviewMapping)
                    ? `Unlock ${key} (will change on remix)`
                    : `Lock ${key} (will stay the same on remix)`
                }
              >
                {lockedElements.has(key as keyof UIPreviewMapping) ? (
                  <Lock size={14} />
                ) : (
                  <Unlock size={14} />
                )}
              </button>
            </div>
          ))}
        </div>

        {lockedElements.size > 0 && (
          <div className="text-xs text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded p-2">
            🔒 {lockedElements.size} element{lockedElements.size > 1 ? 's' : ''} locked - will not change on remix
          </div>
        )}
      </div>
    </div>
  );
};