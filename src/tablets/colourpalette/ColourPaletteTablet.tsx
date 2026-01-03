import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ColourPaletteState, ColorInfo, UIPreviewMapping } from './types';
import { createColorInfo } from './utils/colourUtils';
import { usePaletteEngine } from './hooks/usePaletteEngine';
import { PaletteCanvas } from './components/PaletteCanvas';
import { Toolbar } from './components/Toolbar';
import { SidePanel } from './components/SidePanel';

// Feature Components
import { ImageColourExtractor } from './components/ImageColourExtractor';
import { LiveUIPreview } from './components/LiveUIPreview';
import { AccessibilityMatrix } from './components/AccessibilityMatrix';
import { ExportPanel } from './components/ExportPanel';
import { useTabletTabCreation } from '../bridge';

interface ColourPaletteTabletProps {
  state: ColourPaletteState;
  onChange: (newState: ColourPaletteState) => void;
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
] as const;

const DEFAULT_UI_MAPPING: UIPreviewMapping = {
  background: '#FFFFFF',
  text: '#1F2937',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#10B981',
  border: '#E5E7EB',
};

export const ColourPaletteTablet: React.FC<ColourPaletteTabletProps> = ({
  state,
  onChange,
}) => {
  const { createBackgroundTab } = useTabletTabCreation();

  // -- Local UI State --
  const [activePanel, setActivePanel] = useState<'image' | 'preview' | 'accessibility' | 'export' | null>(null);
  const [uiMapping, setUiMapping] = useState<UIPreviewMapping>(state.uiMapping || DEFAULT_UI_MAPPING);

  // -- Engine Hook --
  const stableInitialColors = useMemo(() => {
    if (state.colors && state.colors.length > 0) return state.colors;
    return DEFAULT_COLORS.map(createColorInfo);
  }, []);

  const {
    colors,
    canUndo,
    canRedo,
    generate,
    updateColor,
    toggleLock,
    moveColor,
    undo,
    redo,
    setPalette,
  } = usePaletteEngine(stableInitialColors);

  // -- State Synchronization --
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const externalColors = stateRef.current.colors;
    const isDifferent = colors.length !== externalColors.length ||
      colors.some((c, i) => c.hex !== externalColors[i]?.hex || c.isLocked !== externalColors[i]?.isLocked);

    if (isDifferent) {
      onChange({
        ...stateRef.current,
        colors: [...colors],
      });
    }
  }, [colors, onChange]);

  useEffect(() => {
    const isDifferent = state.colors.length !== colors.length ||
      state.colors.some((c, i) => c.hex !== colors[i]?.hex || c.isLocked !== colors[i]?.isLocked);

    if (isDifferent && state.colors.length > 0) {
      setPalette(state.colors);
    }
  }, [state.colors, setPalette]);

  // -- Event Handlers --
  const handleImageColorsExtracted = useCallback((newColors: ColorInfo[]) => {
    setPalette(newColors);
  }, [setPalette]);

  const handleRegionExtracted = useCallback((newColors: ColorInfo[], region: { x: number; y: number; width: number; height: number }) => {
    setPalette(newColors);
    onChange({ ...stateRef.current, extractionRegion: region });
  }, [setPalette, onChange]);

  const handleColorSuggestionApply = useCallback((index: number, newColor: ColorInfo) => {
    if (colors[index]) {
      updateColor(colors[index].id, newColor.hex);
    }
  }, [colors, updateColor]);

  const handleCreateNewTab = useCallback(async (content: string, language: string, title: string) => {
    try {
      await createBackgroundTab(title, content, language);
    } catch {
      navigator.clipboard.writeText(content).catch(() => { });
    }
  }, [createBackgroundTab]);

  return (
    <div className="relative h-full w-full bg-surface overflow-hidden flex flex-col">
      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <PaletteCanvas
          colors={colors}
          onLockToggle={toggleLock}
          onColorChange={updateColor}
          onMoveColor={moveColor}
        />
      </div>

      {/* Side Panels */}
      <SidePanel
        title="Extract from Image"
        isOpen={activePanel === 'image'}
        onClose={() => setActivePanel(null)}
      >
        <ImageColourExtractor
          imageUrl={state.sourceImageUrl}
          onColorsExtracted={handleImageColorsExtracted}
          onRegionExtracted={handleRegionExtracted}
        />
      </SidePanel>

      <SidePanel
        title="UI Preview"
        isOpen={activePanel === 'preview'}
        onClose={() => setActivePanel(null)}
      >
        <LiveUIPreview
          colors={colors}
          mapping={uiMapping}
          onMappingChange={(m) => {
            setUiMapping(m);
            onChange({ ...stateRef.current, uiMapping: m });
          }}
        />
      </SidePanel>

      <SidePanel
        title="Accessibility Report"
        isOpen={activePanel === 'accessibility'}
        onClose={() => setActivePanel(null)}
      >
        <AccessibilityMatrix
          colors={colors}
          onColorSuggestionApply={handleColorSuggestionApply}
        />
      </SidePanel>

      <SidePanel
        title="Export Palette"
        isOpen={activePanel === 'export'}
        onClose={() => setActivePanel(null)}
      >
        <ExportPanel
          colors={colors}
          onCreateNewTab={handleCreateNewTab}
        />
      </SidePanel>

      {/* Floating Toolbar */}
      <Toolbar
        onGenerate={generate}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(current => current === panel ? null : panel)}
      />

      {/* UI Hints */}
      {!activePanel && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 opacity-40 text-[10px] font-medium tracking-widest text-secondary pointer-events-none uppercase">
          Space to generate • Click Hex to edit • Drag to reorder
        </div>
      )}
    </div>
  );
};

// Default export for the dynamic registry
const createColourPaletteInitialState = (): ColourPaletteState => ({
  type: 'colourpalette' as const,
  colors: [],
  sourceImageUrl: null,
  extractionRegion: null,
  uiMapping: DEFAULT_UI_MAPPING,
  selectedExportFormat: 'hex',
  harmonyType: 'complementary',
  baseColor: DEFAULT_COLORS[0]
});

export default {
  id: 'colourpalette',
  label: 'Colour Palette',

  createInitialState: createColourPaletteInitialState,

  serializeState: (state: ColourPaletteState) => {
    return JSON.stringify(state);
  },

  deserializeState: (serialized: string): ColourPaletteState => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createColourPaletteInitialState();
    }
  },

  render: (state: ColourPaletteState, onChange: (newState: ColourPaletteState) => void) =>
    React.createElement(ColourPaletteTablet, { state, onChange }),
};