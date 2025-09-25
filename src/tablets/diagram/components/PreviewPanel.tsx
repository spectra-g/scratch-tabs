import React, { useState, useRef, useCallback } from 'react';
import { PlusCircle, Minus, RotateCcw, Info, X } from '../../../components/Icons';
import { ClickableElement } from '../types';

interface PreviewPanelProps {
  svgContent: string | null;
  isRendering: boolean;
  onElementClick: (event: React.MouseEvent) => ClickableElement | null;
  onHighlightLine?: (lineNumber: number) => void;
}

/**
 * Check if SVG content is an error SVG that should not be displayed
 */
const isErrorSvg = (svg: string): boolean => {
  const hasErrorAria = svg.includes('aria-roledescription="error"');
  const hasErrorText = svg.includes('Syntax error') || svg.includes('Parse error');
  
  return hasErrorAria || hasErrorText;
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  svgContent,
  isRendering,
  onElementClick,
  onHighlightLine
}) => {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedElement, setSelectedElement] = useState<ClickableElement | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  // Monitor for any unauthorized DOM changes
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.id?.startsWith('ddiagram-') || element.innerHTML?.includes('Syntax error')) {
              element.remove();
            }
          }
        });
      });
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  /**
   * Handles zoom controls
   */
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    setZoom(prevZoom => {
      switch (direction) {
        case 'in':
          return Math.min(prevZoom + 10, 500);
        case 'out':
          return Math.max(prevZoom - 10, 10);
        case 'reset':
          setPan({ x: 0, y: 0 });
          return 100;
        default:
          return prevZoom;
      }
    });
  }, []);

  /**
   * Handles mouse wheel zoom
   */
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 'out' : 'in';
      handleZoom(delta);
    }
  }, [handleZoom]);

  /**
   * Handles pan start
   */
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  }, [pan]);

  /**
   * Handles pan movement
   */
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  /**
   * Handles pan end
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handles SVG element clicks for inspection
   */
  const handleSvgClick = useCallback((event: React.MouseEvent) => {
    // Don't handle clicks during dragging
    if (isDragging) return;

    const clickedElement = onElementClick(event);
    if (clickedElement) {
      setSelectedElement(clickedElement);
      
      // Position inspector near the click
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setInspectorPosition({
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top + 10
        });
      }

      // Highlight corresponding line in editor
      onHighlightLine?.(clickedElement.lineNumber);
    } else {
      setSelectedElement(null);
    }
  }, [isDragging, onElementClick, onHighlightLine]);

  /**
   * Closes the element inspector
   */
  const closeInspector = useCallback(() => {
    setSelectedElement(null);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative h-full bg-white overflow-hidden min-h-0"
      onWheel={handleWheel}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-gray-800 rounded-md shadow-lg">
        <button
          onClick={() => handleZoom('out')}
          disabled={zoom <= 10}
          className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200"
          title="Zoom out"
        >
          <Minus size={16} />
        </button>
        
        <div className="px-3 py-2 text-sm font-mono text-gray-200 min-w-[60px] text-center">
          {zoom}%
        </div>
        
        <button
          onClick={() => handleZoom('in')}
          disabled={zoom >= 500}
          className="p-2 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200"
          title="Zoom in"
        >
          <PlusCircle size={16} />
        </button>
        
        <div className="w-px h-6 bg-gray-600" />
        
        <button
          onClick={() => handleZoom('reset')}
          className="p-2 hover:bg-gray-700 text-gray-200"
          title="Reset zoom and pan"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Main content area */}
      <div 
        className={`w-full h-full cursor-grab active:cursor-grabbing p-4 min-h-0 ${
          (isRendering || !svgContent || isErrorSvg(svgContent || '')) 
            ? 'flex items-center justify-center' 
            : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isRendering ? (
          <div className="flex flex-col items-center space-y-3 text-gray-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-sm">Rendering diagram...</span>
          </div>
        ) : svgContent && !isErrorSvg(svgContent) ? (
          <div
            ref={svgRef}
            className="select-none w-full h-full min-h-0 overflow-hidden"
            style={{
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'center center'
            }}
            onClick={handleSvgClick}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-lg font-medium">No diagram to display</p>
            <p className="text-sm">Enter Mermaid code in the editor to see your diagram</p>
          </div>
        )}
      </div>

      {/* Element Inspector */}
      {selectedElement && (
        <div
          className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 max-w-sm z-20"
          style={{
            left: Math.min(inspectorPosition.x, (containerRef.current?.clientWidth || 400) - 300),
            top: Math.min(inspectorPosition.y, (containerRef.current?.clientHeight || 300) - 200)
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Info size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-200">Element Inspector</h3>
            </div>
            <button
              onClick={closeInspector}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-400">Element:</span>
              <span className="ml-2 text-sm font-mono text-blue-400">
                &lt;{selectedElement.elementType}&gt;
              </span>
            </div>
            
            <div>
              <span className="text-xs text-gray-400">Line:</span>
              <span className="ml-2 text-sm font-mono text-green-400">
                {selectedElement.lineNumber}
              </span>
            </div>

            {Object.keys(selectedElement.attributes).length > 0 && (
              <div>
                <span className="text-xs text-gray-400 block mb-1">Attributes:</span>
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {Object.entries(selectedElement.attributes).map(([key, value]) => (
                    <div key={key} className="flex items-start space-x-2 text-xs">
                      <span className="text-yellow-400 font-mono">{key}:</span>
                      <span className="text-gray-300 font-mono break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions overlay when no content */}
      {!svgContent && !isRendering && (
        <div className="absolute bottom-4 left-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 text-center">
          <p className="text-sm text-gray-300 mb-2">
            <strong>Pro Tips:</strong>
          </p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Click any diagram element to highlight its code</p>
            <p>• Use Ctrl+Scroll to zoom, drag to pan</p>
            <p>• Browse templates for quick starts</p>
          </div>
        </div>
      )}
    </div>
  );
};