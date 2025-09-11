import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DiagramTabletState, DiagramTemplate, MermaidTheme, DiagramError, ExportSettings } from './types';
import { Toolbar } from './components/Toolbar';
import { PreviewPanel } from './components/PreviewPanel';
import { TemplateLibrary } from './components/TemplateLibrary';
import { ErrorPanel } from './components/ErrorPanel';
import { useMermaidRenderer } from './hooks/useMermaidRenderer';
// import { detectDiagramType, extractDiagramMetadata } from './utils/mermaidUtils';

interface DiagramTabletProps {
  state: DiagramTabletState;
  onChange: (newState: DiagramTabletState) => void;
}

const DEFAULT_MERMAID_CODE = `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E`;

export const DiagramTablet: React.FC<DiagramTabletProps> = ({
  state,
  onChange
}) => {
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [currentError, setCurrentError] = useState<DiagramError | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  // Ref to access current state without causing re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize with default code if empty
  useEffect(() => {
    if (!state.mermaidCode.trim()) {
      onChange({
        ...state,
        mermaidCode: DEFAULT_MERMAID_CODE
      });
    }
  }, [state, onChange]);

  // Mermaid renderer hook
  const {
    renderedSvg,
    isRendering,
    error,
    handleElementClick,
    forceRender
  } = useMermaidRenderer({
    code: state.mermaidCode,
    theme: state.activeTheme,
    onError: setCurrentError,
    onRenderComplete: useCallback((result) => {
      // Only update if the SVG actually changed to prevent infinite re-renders
      if (stateRef.current.renderedSvg !== result.svg) {
        onChange({
          ...stateRef.current,
          renderedSvg: result.svg,
          errorState: null,
          lastRenderTime: Date.now()
        });
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  });

  /**
   * Updates the Mermaid code
   */
  const updateCode = useCallback((newCode: string) => {
    // Clear both local and state errors when code changes
    setCurrentError(null);
    onChange({
      ...stateRef.current,
      mermaidCode: newCode,
      errorState: null
    });
  }, [onChange]);

  /**
   * Handles template selection
   */
  const handleTemplateSelect = useCallback((template: DiagramTemplate) => {
    updateCode(template.code);
    setShowTemplateLibrary(false);
  }, [updateCode]);

  /**
   * Handles theme changes
   */
  const handleThemeChange = useCallback((newTheme: MermaidTheme) => {
    onChange({
      ...stateRef.current,
      activeTheme: newTheme
    });
  }, [onChange]);

  /**
   * Shows temporary feedback message
   */
  const showCopyFeedback = useCallback((message: string) => {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  /**
   * Optimizes the current diagram code
   */
  const handleOptimize = useCallback(async () => {
    const currentCode = stateRef.current.mermaidCode;
    if (!currentCode.trim()) return;

    setIsOptimizing(true);
    try {
      // Basic optimization: remove comments and extra whitespace
      const optimized = currentCode
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('%%'))
        .join('\n');

      updateCode(optimized);
      showCopyFeedback('Code optimized!');
    } catch (error) {
      console.error('Optimization failed:', error);
      showCopyFeedback('Optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [updateCode, showCopyFeedback]);

  /**
   * Copies code to clipboard
   */
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stateRef.current.mermaidCode);
      showCopyFeedback('Code copied!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      showCopyFeedback('Copy failed');
    }
  }, [showCopyFeedback]);

  /**
   * Copies optimized code to clipboard
   */
  const handleCopyOptimized = useCallback(async () => {
    try {
      const optimized = stateRef.current.mermaidCode
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('%%'))
        .join('\n');
      
      await navigator.clipboard.writeText(optimized);
      showCopyFeedback('Optimized code copied!');
    } catch (error) {
      console.error('Failed to copy optimized code:', error);
      showCopyFeedback('Copy failed');
    }
  }, [showCopyFeedback]);

  /**
   * Exports diagram as SVG
   */
  const handleExportSvg = useCallback(() => {
    if (!renderedSvg) return;

    try {
      const blob = new Blob([renderedSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showCopyFeedback('SVG exported!');
    } catch (error) {
      console.error('Failed to export SVG:', error);
      showCopyFeedback('Export failed');
    }
  }, [renderedSvg, showCopyFeedback]);

  /**
   * Exports diagram as PNG
   */
  const handleExportPng = useCallback(() => {
    if (!renderedSvg) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Get current export settings from ref to avoid dependency on state
        const exportSettings = stateRef.current.exportSettings;
        const resolution = exportSettings.resolution;
        canvas.width = img.width * resolution;
        canvas.height = img.height * resolution;
        
        // Set background color
        ctx.fillStyle = exportSettings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the SVG
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Export as PNG
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagram-${Date.now()}-${resolution}x.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showCopyFeedback('PNG exported!');
          }
        }, 'image/png');
      };

      // Convert SVG to data URL
      const svgBlob = new Blob([renderedSvg], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;
    } catch (error) {
      console.error('Failed to export PNG:', error);
      showCopyFeedback('Export failed');
    }
  }, [renderedSvg, showCopyFeedback]);

  /**
   * Handles element clicks for bidirectional syncing
   */
  const handlePreviewElementClick = useCallback((event: React.MouseEvent) => {
    const clickedElement = handleElementClick(event);
    if (clickedElement) {
      // This would typically trigger Monaco editor highlighting
      // For now, we'll just log the interaction
      console.log('Element clicked:', clickedElement);
    }
    return clickedElement;
  }, [handleElementClick]);

  /**
   * Handles error dismissal
   */
  const handleErrorClose = useCallback(() => {
    setCurrentError(null);
  }, []);

  const handleShowTemplates = useCallback(() => {
    setShowTemplateLibrary(true);
  }, []);

  const handleExportSettingsChange = useCallback((settings: Partial<ExportSettings>) => {
    onChange({
      ...stateRef.current,
      exportSettings: { ...stateRef.current.exportSettings, ...settings }
    });
  }, [onChange]);

  const statistics = useMemo(() => {
    if (!renderedSvg) return null;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(renderedSvg, 'image/svg+xml');
    
    const elements = svgDoc.querySelectorAll('*');
    const paths = svgDoc.querySelectorAll('path');
    const texts = svgDoc.querySelectorAll('text');
    const groups = svgDoc.querySelectorAll('g');
    
    return {
      totalElements: elements.length,
      paths: paths.length,
      texts: texts.length,
      groups: groups.length,
      codeLines: state.mermaidCode.split('\n').length,
      codeSize: new Blob([state.mermaidCode]).size
    };
  }, [renderedSvg, state.mermaidCode]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <Toolbar
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onCopyCode={handleCopyCode}
        onCopyOptimized={handleCopyOptimized}
        onOptimize={handleOptimize}
        onShowTemplates={handleShowTemplates}
        onRefresh={forceRender}
        theme={state.activeTheme}
        onThemeChange={handleThemeChange}
        isRendering={isRendering}
        isOptimizing={isOptimizing}
        exportSettings={state.exportSettings}
        onExportSettingsChange={handleExportSettingsChange}
        statistics={statistics}
      />

      {/* Error Panel */}
      {(currentError || error) && (
        <ErrorPanel
          error={currentError || error}
          onClose={handleErrorClose}
          onGoToLine={(lineNumber) => {
            // This would typically trigger Monaco editor navigation
            console.log('Navigate to line:', lineNumber);
          }}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Code Editor Panel */}
        <div className="w-1/2 border-r border-gray-700">
          <div className="h-full bg-gray-850 p-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mermaid Code
              </label>
              <div className="text-xs text-gray-500 mb-2">
                Type your Mermaid diagram code below. Changes will be reflected in real-time.
              </div>
            </div>
            
            <textarea
              value={state.mermaidCode}
              onChange={(e) => updateCode(e.target.value)}
              className="w-full h-[calc(100%-80px)] bg-gray-800 border border-gray-600 rounded-md p-3 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent custom-scrollbar"
              placeholder="Enter your Mermaid diagram code here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2">
          <PreviewPanel
            svgContent={renderedSvg}
            isRendering={isRendering}
            onElementClick={handlePreviewElementClick}
            onHighlightLine={(lineNumber) => {
              console.log('Highlight line:', lineNumber);
            }}
          />
        </div>
      </div>

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Copy feedback */}
      {copyFeedback && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {copyFeedback}
        </div>
      )}
    </div>
  );
};

// Default export for the dynamic registry
const createDiagramInitialState = (payload?: { mermaidCode?: string }): DiagramTabletState => ({
  type: 'diagram' as const,
  mermaidCode: payload?.mermaidCode || `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
  renderedSvg: null,
  errorState: null,
  activeTheme: 'default',
  selectedTimezones: [],
  history: [],
  pinnedDiagrams: [],
  isRendering: false,
  lastRenderTime: 0,
  templateSearchQuery: '',
  showTemplateLibrary: false,
  exportSettings: {
    format: 'svg',
    resolution: 2,
    includeStyles: true,
    backgroundColor: 'transparent'
  }
});

export default {
  id: 'diagram',
  label: 'Diagram Editor',
  
  createInitialState: createDiagramInitialState,
  
  serializeState: (state: DiagramTabletState) => JSON.stringify(state),
  
  deserializeState: (serialized: string): DiagramTabletState => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createDiagramInitialState();
    }
  },
  
  render: (state: DiagramTabletState, onChange: (newState: DiagramTabletState) => void) => 
    React.createElement(DiagramTablet, { state, onChange }),
};