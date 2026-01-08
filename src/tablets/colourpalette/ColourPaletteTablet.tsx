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
import { HistoryPanel } from './components/HistoryPanel';
import { useTabletTabCreation } from '../bridge';
import { useTabletContext } from '../bridge/context';

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
  const { tabId } = useTabletContext();

  // -- Local UI State --
  const [activePanel, setActivePanel] = useState<'image' | 'preview' | 'accessibility' | 'export' | 'history' | null>(null);
  const [uiMapping, setUiMapping] = useState<UIPreviewMapping>(state.uiMapping || DEFAULT_UI_MAPPING);

  // -- Engine Hook --
  const stableInitialColors = useMemo(() => {
    if (state.colors && state.colors.length > 0) return state.colors;
    return DEFAULT_COLORS.map(createColorInfo);
  }, []);

  const {
    colors,
    history,
    canUndo,
    canRedo,
    generate,
    updateColor,
    toggleLock,
    moveColor,
    undo,
    redo,
    setPalette,
  } = usePaletteEngine(stableInitialColors, state.history);

  // -- State Synchronization --
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const externalColors = stateRef.current.colors;
    const externalHistory = stateRef.current.history || [];

    const isColorsDifferent = colors.length !== externalColors.length ||
      colors.some((c, i) => c.hex !== externalColors[i]?.hex || c.isLocked !== externalColors[i]?.isLocked);

    const isHistoryDifferent = history.length !== externalHistory.length;

    if (isColorsDifferent || isHistoryDifferent) {
      onChange({
        ...stateRef.current,
        colors: [...colors],
        history: [...history],
      });
    }
  }, [colors, history, onChange]);

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
      await createBackgroundTab(title, content, language, tabId);
    } catch {
      navigator.clipboard.writeText(content).catch(() => { });
    }
  }, [createBackgroundTab, tabId]);

  return (
    <div className="relative h-full w-full bg-surface overflow-hidden flex flex-row">
      {/* Main Canvas Area - Transitions width based on active panel */}
      <div
        className={`
          relative h-full transition-all duration-300 ease-in-out flex flex-col
          ${activePanel ? 'hidden md:flex md:w-[calc(100%-400px)]' : 'w-full'}
        `}
      >
        <div className="flex-1 relative overflow-hidden">
          <PaletteCanvas
            colors={colors}
            onLockToggle={toggleLock}
            onColorChange={updateColor}
            onMoveColor={moveColor}
          />
        </div>

        {/* Floating Toolbar inside the canvas container */}
        <Toolbar
          onGenerate={generate}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          activePanel={activePanel}
          onTogglePanel={(panel) => setActivePanel(current => current === panel ? null : panel)}
        />

        {/* UI Hints inside the canvas container */}
        {!activePanel && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 opacity-40 text-[10px] font-medium tracking-widest text-secondary pointer-events-none uppercase whitespace-nowrap">
            Space to generate • Click Hex to edit • Drag to reorder
          </div>
        )}
      </div>

      {/* Side Panels - Now part of the flex layout for "squeezing" effect */}
      <div
        className={`
          h-full bg-surface border-l border-base transition-all duration-300 ease-in-out overflow-hidden flex flex-col
          ${activePanel ? 'w-full md:w-[400px] opacity-100' : 'w-0 opacity-0'}
        `}
      >
        {activePanel && (
          <SidePanel
            title={
              activePanel === 'image' ? "Extract from Image" :
                activePanel === 'preview' ? "UI Preview" :
                  activePanel === 'accessibility' ? "Accessibility Report" :
                    activePanel === 'history' ? "Timeline" :
                      "Export Palette"
            }
            isOpen={true} // Always "open" when visible in flex
            onClose={() => setActivePanel(null)}
          >
            {activePanel === 'image' && (
              <ImageColourExtractor
                imageUrl={state.sourceImageUrl}
                onColorsExtracted={handleImageColorsExtracted}
                onRegionExtracted={handleRegionExtracted}
              />
            )}
            {activePanel === 'preview' && (
              <LiveUIPreview
                colors={colors}
                mapping={uiMapping}
                onMappingChange={(m) => {
                  setUiMapping(m);
                  onChange({ ...stateRef.current, uiMapping: m });
                }}
              />
            )}
            {activePanel === 'accessibility' && (
              <AccessibilityMatrix
                colors={colors}
                onColorSuggestionApply={handleColorSuggestionApply}
              />
            )}
            {activePanel === 'export' && (
              <ExportPanel
                colors={colors}
                onCreateNewTab={handleCreateNewTab}
              />
            )}
            {activePanel === 'history' && (
              <HistoryPanel
                history={history}
                onRestore={(palette) => {
                  setPalette(palette);
                }}
              />
            )}
          </SidePanel>
        )}
      </div>
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
  history: [],
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