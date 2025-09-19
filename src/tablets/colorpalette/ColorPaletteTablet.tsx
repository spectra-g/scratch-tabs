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

const DEFAULT_UI_MAPPING: UIPreviewMapping = {
  background: '#FFFFFF',
  text: '#1F2937',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#10B981',
  border: '#E5E7EB',
};

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
] as const;

export const ColorPaletteTablet: React.FC<ColorPaletteTabletProps> = ({
  state,
  onChange,
}) => {

  const [activeTab, setActiveTab] = useState<'generator' | 'palette' | 'preview' | 'accessibility' | 'export'>('generator');

  // Store ImageData separately since it can't be serialized by the tablet framework
  const [currentImageData, setCurrentImageData] = useState<ImageData | null>(null);
  const [colorsUpdated, setColorsUpdated] = useState(false);

  // Sync imageData with imageUrl state
  useEffect(() => {
    if (!state.sourceImageUrl) {
      setCurrentImageData(null);
    }
  }, [state.sourceImageUrl]);

  // Initialize with default colors if empty
  useEffect(() => {
    if (state.colors.length === 0) {
      const defaultColors = DEFAULT_COLORS.map(createColorInfo);

      onChange({
        ...state,
        colors: defaultColors,
        uiMapping: DEFAULT_UI_MAPPING,
      });
    }
  }, [state, onChange]);

  const handleColorsGenerated = useCallback((colors: ColorInfo[]) => {
    setColorsUpdated(true);
    setTimeout(() => setColorsUpdated(false), 500);

    // Auto-map colors to UI elements for immediate preview
    const autoMapping: UIPreviewMapping = {
      background: colors[0]?.hex || DEFAULT_UI_MAPPING.background,
      text: colors[colors.length - 1]?.hex || DEFAULT_UI_MAPPING.text,
      primary: colors[1]?.hex || DEFAULT_UI_MAPPING.primary,
      secondary: colors[2]?.hex || DEFAULT_UI_MAPPING.secondary,
      accent: colors[3]?.hex || DEFAULT_UI_MAPPING.accent,
      border: colors[4]?.hex || DEFAULT_UI_MAPPING.border,
    };

    // Update the tablet state
    onChange({
      ...state,
      colors: [...colors],
      activeColorIndex: 0,
      uiMapping: autoMapping,
      error: null,
    });
  }, [state, onChange]);

  const handleImageLoaded = useCallback((imageData: ImageData, imageUrl: string) => {
    setCurrentImageData(imageData);
    onChange({
      ...state,
      sourceImageUrl: imageUrl,
      generationMethod: 'image',
      error: null,
    });
  }, [state, onChange]);

  const handleImageProcessed = useCallback((imageData: ImageData, imageUrl: string, colors: ColorInfo[]) => {
    setCurrentImageData(imageData);

    // Auto-map colors to UI elements for immediate preview
    const autoMapping: UIPreviewMapping = {
      background: colors[0]?.hex || DEFAULT_UI_MAPPING.background,
      text: colors[colors.length - 1]?.hex || DEFAULT_UI_MAPPING.text,
      primary: colors[1]?.hex || DEFAULT_UI_MAPPING.primary,
      secondary: colors[2]?.hex || DEFAULT_UI_MAPPING.secondary,
      accent: colors[3]?.hex || DEFAULT_UI_MAPPING.accent,
      border: colors[4]?.hex || DEFAULT_UI_MAPPING.border,
    };

    onChange({
      ...state,
      sourceImageUrl: imageUrl,
      colors,
      activeColorIndex: 0,
      generationMethod: 'image' as const,
      uiMapping: autoMapping,
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

  const handleCreateNewTab = useCallback((content: string) => {
    // This would integrate with the tablet bridge to create a new tab
    // For now, we'll copy to clipboard as fallback
    navigator.clipboard.writeText(content).catch(() => {
      // Silently fail if clipboard access is denied
    });
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
              onImageLoadedAndColorsGenerated={handleImageProcessed}
              onError={handleError}
            />

            {currentImageData && state.sourceImageUrl && (
              <ImageColorExtractor
                imageData={currentImageData}
                imageUrl={state.sourceImageUrl}
                onColorsExtracted={handleColorsGenerated}
                onRegionSelect={handleRegionSelect}
              />
            )}

            {/* Generated Colors Preview */}
            {state.colors.length > 0 && (
              <div className={`space-y-3 border rounded-lg p-4 transition-all duration-300 ${
                colorsUpdated
                  ? 'border-green-400 bg-green-800/20 shadow-lg shadow-green-400/20'
                  : 'border-gray-600 bg-gray-800/30'
              }`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">
                    Generated Palette
                    {colorsUpdated && <span className="ml-2 text-green-400 animate-pulse">● Updated</span>}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                    {state.colors.length} colors
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {state.colors.map((color, index) => (
                    <div
                      key={`color-${index}-${color.hex}`}
                      className="group relative"
                    >
                      <div
                        className="w-full h-12 rounded-lg border border-gray-600 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-blue-400"
                        style={{ backgroundColor: color.hex }}
                        title={`${color.hex} • ${color.name || 'Unnamed'}`}
                        onClick={() => setActiveTab('palette')}
                      />
                      <div className="mt-1 text-center">
                        <span className="text-xs font-mono text-gray-400">{color.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button
                    onClick={() => setActiveTab('palette')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline"
                  >
                    View in Palette tab for editing →
                  </button>
                </div>
              </div>
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

// Default export for the dynamic registry
const createColorPaletteInitialState = (): ColorPaletteState => ({
  type: 'colorpalette' as const,
  colors: [],
  activeColorIndex: 0,
  generationMethod: 'manual',
  sourceImageUrl: null,
  sourceImageData: null,
  extractionRegion: null,
  uiMapping: DEFAULT_UI_MAPPING,
  selectedExportFormat: 'hex',
  isExtracting: false,
  error: null,
  harmonyType: 'complementary',
  baseColor: DEFAULT_COLORS[0]
});

export default {
  id: 'colorpalette',
  label: 'Color Palette',
  
  createInitialState: createColorPaletteInitialState,
  
  serializeState: (state: ColorPaletteState) => {
    // Exclude non-serializable ImageData from state persistence
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sourceImageData, ...serializableState } = state;
    return JSON.stringify(serializableState);
  },
  
  deserializeState: (serialized: string): ColorPaletteState => {
    try {
      const parsed = JSON.parse(serialized);
      // Ensure sourceImageData is null after deserialization since it can't be persisted
      return { ...parsed, sourceImageData: null };
    } catch {
      return createColorPaletteInitialState();
    }
  },
  
  render: (state: ColorPaletteState, onChange: (newState: ColorPaletteState) => void) => 
    React.createElement(ColorPaletteTablet, { state, onChange }),
};