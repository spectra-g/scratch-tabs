import React, { useState, useCallback, useEffect } from 'react';
import { ColorPaletteState, ColorInfo, UIPreviewMapping } from './types';
import { PaletteGenerator } from './components/PaletteGenerator';
import { PaletteDisplay } from './components/PaletteDisplay';
import { LiveUIPreview } from './components/LiveUIPreview';
import { AccessibilityMatrix } from './components/AccessibilityMatrix';
import { ExportPanel } from './components/ExportPanel';
import { ImageColorExtractor } from './components/ImageColorExtractor';
import { createColorInfo } from './utils/colorUtils';

interface ColorPaletteTabletProps {
  state: ColorPaletteState;
  onChange: (newState: ColorPaletteState) => void;
}

const defaultUIMapping: UIPreviewMapping = {
  background: '#FFFFFF',
  text: '#1F2937',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#10B981',
  border: '#E5E7EB',
};

export const ColorPaletteTablet: React.FC<ColorPaletteTabletProps> = ({
  state,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'palette' | 'preview' | 'accessibility' | 'export'>('generator');

  // Initialize with default colors if empty
  useEffect(() => {
    if (state.colors.length === 0) {
      const defaultColors = [
        createColorInfo('#3B82F6'), // Blue
        createColorInfo('#10B981'), // Green
        createColorInfo('#F59E0B'), // Yellow
        createColorInfo('#EF4444'), // Red
        createColorInfo('#8B5CF6'), // Purple
      ];
      
      onChange({
        ...state,
        colors: defaultColors,
        uiMapping: defaultUIMapping,
      });
    }
  }, [state, onChange]);

  const handleColorsGenerated = useCallback((colors: ColorInfo[]) => {
    onChange({
      ...state,
      colors,
      activeColorIndex: 0,
      error: null,
    });
  }, [state, onChange]);

  const handleImageLoaded = useCallback((imageData: ImageData, imageUrl: string) => {
    onChange({
      ...state,
      sourceImageData: imageData,
      sourceImageUrl: imageUrl,
      generationMethod: 'image',
      error: null,
    });
  }, [state, onChange]);

  const handleError = useCallback((error: string) => {
    onChange({
      ...state,
      error,
    });
  }, [state, onChange]);

  const handleColorsChange = useCallback((colors: ColorInfo[]) => {
    onChange({
      ...state,
      colors,
    });
  }, [state, onChange]);

  const handleActiveColorChange = useCallback((index: number) => {
    onChange({
      ...state,
      activeColorIndex: index,
    });
  }, [state, onChange]);

  const handleMappingChange = useCallback((mapping: UIPreviewMapping) => {
    onChange({
      ...state,
      uiMapping: mapping,
    });
  }, [state, onChange]);

  const handleColorSuggestionApply = useCallback((colorIndex: number, newColor: ColorInfo) => {
    const newColors = [...state.colors];
    newColors[colorIndex] = newColor;
    onChange({
      ...state,
      colors: newColors,
    });
  }, [state, onChange]);

  const handleRegionSelect = useCallback((region: { x: number; y: number; width: number; height: number }) => {
    onChange({
      ...state,
      extractionRegion: region,
    });
  }, [state, onChange]);

  const handleCreateNewTab = useCallback((content: string, language: string, title: string) => {
    // This would integrate with the tablet bridge to create a new tab
    // For now, we'll copy to clipboard as fallback
    navigator.clipboard.writeText(content).catch(console.error);
  }, []);

  const tabs = [
    { id: 'generator', label: 'Generate', icon: '🎨' },
    { id: 'palette', label: 'Palette', icon: '🎯' },
    { id: 'preview', label: 'UI Preview', icon: '👁️' },
    { id: 'accessibility', label: 'Accessibility', icon: '♿' },
    { id: 'export', label: 'Export', icon: '📤' },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Color Palette Workspace</h1>
            <p className="text-sm text-gray-400">
              Extract, create, and test color palettes with accessibility insights
            </p>
          </div>
          {state.error && (
            <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">
              {state.error}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-4 pt-4">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'generator' && (
          <div className="space-y-6">
            <PaletteGenerator
              onColorsGenerated={handleColorsGenerated}
              onImageLoaded={handleImageLoaded}
              onError={handleError}
            />
            
            {state.sourceImageData && state.sourceImageUrl && (
              <ImageColorExtractor
                imageData={state.sourceImageData}
                imageUrl={state.sourceImageUrl}
                onColorsExtracted={handleColorsGenerated}
                onRegionSelect={handleRegionSelect}
              />
            )}
          </div>
        )}

        {activeTab === 'palette' && (
          <PaletteDisplay
            colors={state.colors}
            activeColorIndex={state.activeColorIndex}
            onColorsChange={handleColorsChange}
            onActiveColorChange={handleActiveColorChange}
          />
        )}

        {activeTab === 'preview' && (
          <LiveUIPreview
            colors={state.colors}
            mapping={state.uiMapping}
            onMappingChange={handleMappingChange}
          />
        )}

        {activeTab === 'accessibility' && (
          <AccessibilityMatrix
            colors={state.colors}
            onColorSuggestionApply={handleColorSuggestionApply}
          />
        )}

        {activeTab === 'export' && (
          <ExportPanel
            colors={state.colors}
            onCreateNewTab={handleCreateNewTab}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{state.colors.length} colors in palette</span>
          <span>100% client-side processing</span>
        </div>
      </div>
    </div>
  );
};