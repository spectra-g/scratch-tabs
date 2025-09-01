import { useState, useEffect, useCallback, useRef } from 'react';
import { DiagramError, MermaidRenderResult, MermaidTheme } from '../types';

interface UseMermaidRendererProps {
  code: string;
  theme: MermaidTheme;
  onError?: (error: DiagramError | null) => void;
  onRenderComplete?: (result: MermaidRenderResult) => void;
}

interface MermaidWorkerMessage {
  type: 'render' | 'result' | 'error';
  payload?: any;
}

/**
 * Custom hook for rendering Mermaid diagrams with Web Worker support
 * Provides bidirectional syncing and intelligent error handling
 */
export const useMermaidRenderer = ({
  code,
  theme,
  onError,
  onRenderComplete
}: UseMermaidRendererProps) => {
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [elementMap, setElementMap] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<DiagramError | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Creates a Web Worker for Mermaid rendering
   */
  const createMermaidWorker = useCallback(() => {
    const workerCode = `
      // Import Mermaid from CDN
      importScripts('https://cdn.skypack.dev/mermaid@10.6.1');
      
      // Configure Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif'
      });
      
      // Message handler
      self.onmessage = async function(e) {
        const { type, payload } = e.data;
        
        if (type === 'render') {
          try {
            const { code, theme, id } = payload;
            
            // Update theme if provided
            if (theme) {
              mermaid.initialize({ theme });
            }
            
            // Render the diagram
            const { svg } = await mermaid.render(id, code);
            
            // Create element mapping for click-to-highlight
            const elementMap = new Map();
            const lines = code.split('\\n');
            
            // Parse the SVG to create element mappings
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
            const elements = svgDoc.querySelectorAll('[id]');
            
            elements.forEach(element => {
              const elementId = element.id;
              // Find corresponding line in code (simplified mapping)
              lines.forEach((line, index) => {
                if (line.includes(elementId) || 
                    (element.textContent && line.includes(element.textContent.trim()))) {
                  elementMap.set(elementId, index + 1);
                }
              });
            });
            
            self.postMessage({
              type: 'result',
              payload: {
                svg,
                elementMap: Array.from(elementMap.entries())
              }
            });
            
          } catch (error) {
            // Parse Mermaid error for better user feedback
            const errorMessage = error.message || 'Unknown rendering error';
            const lineMatch = errorMessage.match(/line (\\d+)/i);
            const line = lineMatch ? parseInt(lineMatch[1]) : 1;
            
            self.postMessage({
              type: 'error',
              payload: {
                line,
                message: errorMessage,
                type: 'render',
                suggestion: getSuggestionForError(errorMessage)
              }
            });
          }
        }
      };
      
      function getSuggestionForError(message) {
        if (message.includes('arrow')) {
          return 'Check arrow syntax. Use --> for solid arrows, -.-> for dotted arrows';
        }
        if (message.includes('node')) {
          return 'Check node syntax. Ensure proper brackets: [] for rectangles, () for rounded';
        }
        if (message.includes('syntax')) {
          return 'Check diagram syntax. Ensure proper indentation and valid Mermaid syntax';
        }
        return 'Check the Mermaid documentation for valid syntax';
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }, []);

  /**
   * Renders the Mermaid diagram
   */
  const renderDiagram = useCallback((diagramCode: string, diagramTheme: MermaidTheme) => {
    if (!diagramCode.trim()) {
      setRenderedSvg(null);
      setError(null);
      setElementMap(new Map());
      return;
    }

    setIsRendering(true);
    setError(null);

    // Create worker if it doesn't exist
    if (!workerRef.current) {
      workerRef.current = createMermaidWorker();
      
      workerRef.current.onmessage = (e: MessageEvent<MermaidWorkerMessage>) => {
        const { type, payload } = e.data;
        
        if (type === 'result') {
          const { svg, elementMap } = payload;
          setRenderedSvg(svg);
          setElementMap(new Map(elementMap));
          setIsRendering(false);
          
          onRenderComplete?.({
            svg,
            elementMap: new Map(elementMap)
          });
        } else if (type === 'error') {
          const errorObj = payload as DiagramError;
          setError(errorObj);
          setRenderedSvg(null);
          setIsRendering(false);
          onError?.(errorObj);
        }
      };

      workerRef.current.onerror = (error) => {
        const errorObj: DiagramError = {
          line: 1,
          message: 'Worker error: Failed to load Mermaid renderer',
          type: 'render',
          suggestion: 'Check your internet connection and try again'
        };
        setError(errorObj);
        setIsRendering(false);
        onError?.(errorObj);
      };
    }

    // Send render request to worker
    workerRef.current.postMessage({
      type: 'render',
      payload: {
        code: diagramCode,
        theme: diagramTheme,
        id: `diagram-${Date.now()}`
      }
    });
  }, [createMermaidWorker, onError, onRenderComplete]);

  /**
   * Debounced rendering to avoid excessive re-renders
   */
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderDiagram(code, theme);
    }, 300); // 300ms debounce

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [code, theme, renderDiagram]);

  /**
   * Cleanup worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles clicks on SVG elements for bidirectional syncing
   */
  const handleElementClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as SVGElement;
    
    // Find the nearest SVG element with an ID
    let element = target;
    while (element && element !== event.currentTarget) {
      if (element.id && elementMap.has(element.id)) {
        const lineNumber = elementMap.get(element.id);
        return {
          elementId: element.id,
          lineNumber: lineNumber!,
          elementType: element.tagName.toLowerCase(),
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {} as Record<string, string>)
        };
      }
      element = element.parentElement as SVGElement;
    }
    
    return null;
  }, [elementMap]);

  /**
   * Forces a re-render of the current diagram
   */
  const forceRender = useCallback(() => {
    renderDiagram(code, theme);
  }, [code, theme, renderDiagram]);

  /**
   * Gets statistics about the current diagram
   */
  const getStatistics = useCallback(() => {
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
      codeLines: code.split('\n').length,
      codeSize: new Blob([code]).size
    };
  }, [renderedSvg, code]);

  return {
    renderedSvg,
    isRendering,
    error,
    elementMap,
    handleElementClick,
    forceRender,
    getStatistics
  };
};