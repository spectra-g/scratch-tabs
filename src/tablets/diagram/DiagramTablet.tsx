import React, { useState, useCallback, useEffect } from 'react';
import { DiagramTabletState, DiagramTemplate, MermaidTheme, DiagramError } from './types';
import { Toolbar } from './components/Toolbar';
import { PreviewPanel } from './components/PreviewPanel';
import { TemplateLibrary } from './components/TemplateLibrary';
import { ErrorPanel } from './components/ErrorPanel';
import { useMermaidRenderer } from './hooks/useMermaidRenderer';
import { detectDiagramType, extractDiagramMetadata } from './utils/mermaidUtils';

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
    elementMap,
    handleElementClick,
    forceRender,
    getStatistics
  } = useMermaidRenderer({
    code: state.mermaidCode,
    theme: state.activeTheme,
    onError: setCurrentError,
    onRenderComplete: (result) => {
      onChange({
        ...state,
        renderedSvg: result.svg,
        errorState: null,
        lastRenderTime: Date.now()
      });
    }
  });

  /**
   * Updates the Mermaid code
   */
  const updateCode = useCallback((newCode: string) => {
    onChange({
      ...state,
      mermaidCode: newCode,
      errorState: null
    });
  }, [state, onChange]);

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
      ...state,
      activeTheme: newTheme
    });
  }, [state, onChange]);

  /**
   * Optimizes the current diagram code
   */
  const handleOptimize = useCallback(async () => {
    if (!state.mermaidCode.trim()) return;

    setIsOptimizing(true);
    try {
      // Basic optimization: remove comments and extra whitespace
      const optimized = state.mermaidCode
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
  }, [state.mermaidCode, updateCode]);

  /**
   * Shows temporary feedback message
   */
  const showCopyFeedback = useCallback((message: string) => {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  /**
   * Copies code to clipboard
   */
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.mermaidCode);
      showCopyFeedback('Code copied!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      showCopyFeedback('Copy failed');
    }
  }, [state.mermaidCode, showCopyFeedback]);

  /**
   * Copies optimized code to clipboard
   */
  const handleCopyOptimized = useCallback(async () => {
    try {
      const optimized = state.mermaidCode
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
  }, [state.mermaidCode, showCopyFeedback]);

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
        const resolution = state.exportSettings.resolution;
        canvas.width = img.width * resolution;
        canvas.height = img.height * resolution;
        
        // Set background color
        ctx.fillStyle = state.exportSettings.backgroundColor;
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
  }, [renderedSvg, state.exportSettings, showCopyFeedback]);

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

  const statistics = getStatistics();

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <Toolbar
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onCopyCode={handleCopyCode}
        onCopyOptimized={handleCopyOptimized}
        onOptimize={handleOptimize}
        onShowTemplates={() => setShowTemplateLibrary(true)}
        onRefresh={forceRender}
        theme={state.activeTheme}
        onThemeChange={handleThemeChange}
        isRendering={isRendering}
        isOptimizing={isOptimizing}
        exportSettings={state.exportSettings}
        onExportSettingsChange={(settings) => onChange({
          ...state,
          exportSettings: { ...state.exportSettings, ...settings }
        })}
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
              className="w-full h-[calc(100%-80px)] bg-gray-800 border border-gray-600 rounded-md p-3 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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