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
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Global reference to prevent multiple loads
   */
  const loadMermaidPromise = useRef<Promise<any> | null>(null);

  /**
   * Loads Mermaid library dynamically in main thread with proper singleton handling
   */
  const loadMermaid = useCallback(async () => {
    // Return existing Mermaid instance if already loaded
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      return (window as any).mermaid;
    }

    // Return existing loading promise to prevent multiple simultaneous loads
    if (loadMermaidPromise.current) {
      return loadMermaidPromise.current;
    }

    // Check if script is already being loaded or exists
    const existingScript = document.querySelector('script[src*="mermaid"]');
    if (existingScript && (window as any).mermaid) {
      return (window as any).mermaid;
    }

    // Create new loading promise
    loadMermaidPromise.current = new Promise((resolve, reject) => {
      // Temporarily disable AMD to prevent conflicts
      const originalDefine = (window as any).define;
      const originalRequire = (window as any).require;
      
      if (originalDefine) {
        (window as any).define = undefined;
      }
      if (originalRequire) {
        (window as any).require = undefined;
      }

      const restoreAMD = () => {
        if (originalDefine) {
          (window as any).define = originalDefine;
        }
        if (originalRequire) {
          (window as any).require = originalRequire;
        }
      };

      const tryLoadFromCDN = (url: string, isLastTry = false) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        
        script.onload = () => {
          restoreAMD();
          
          if ((window as any).mermaid) {
            (window as any).mermaid.initialize({
              startOnLoad: false,
              theme: 'dark',
              securityLevel: 'loose',
              fontFamily: 'Inter, system-ui, sans-serif'
            });
            resolve((window as any).mermaid);
          } else {
            reject(new Error('Mermaid object not found after loading'));
          }
        };
        
        script.onerror = () => {
          script.remove();
          
          if (!isLastTry) {
            // Try fallback CDN
            tryLoadFromCDN('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js', true);
          } else {
            restoreAMD();
            reject(new Error('Failed to load Mermaid from all CDN sources'));
          }
        };
        
        document.head.appendChild(script);
      };

      // Start loading from primary CDN
      tryLoadFromCDN('https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js');
    });

    return loadMermaidPromise.current;
  }, []);

  /**
   * Legacy Web Worker approach (kept for reference but not used)
   */
  const createMermaidWorker = useCallback(() => {
    const workerCode = `
      // Import Mermaid from CDN with fallback
      let mermaidLoaded = false;
      
      const cdnUrls = [
        'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
        'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js'
      ];
      
      for (const url of cdnUrls) {
        try {
          importScripts(url);
          mermaidLoaded = true;
          break; // Success, exit loop
        } catch (error) {
          console.warn('Failed to load Mermaid from ' + url + ':', error.message);
        }
      }
      
      if (mermaidLoaded) {
        // Configure Mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif'
        });
      }
      
      // Message handler
      self.onmessage = async function(e) {
        const { type, payload } = e.data;
        
        if (type === 'render') {
          try {
            // Check if Mermaid loaded successfully
            if (!mermaidLoaded || typeof mermaid === 'undefined') {
              throw new Error('Mermaid library failed to load');
            }
            
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
   * Renders the Mermaid diagram using main thread
   */
  const renderDiagram = useCallback(async (diagramCode: string, diagramTheme: MermaidTheme) => {
    if (!diagramCode.trim()) {
      setRenderedSvg(null);
      setError(null);
      setElementMap(new Map());
      return;
    }

    setIsRendering(true);
    setError(null);

    try {
      // Load Mermaid if not already loaded
      const mermaid = await loadMermaid();
      setMermaidLoaded(true);
      
      // Update theme if provided
      if (diagramTheme) {
        mermaid.initialize({ theme: diagramTheme });
      }
      
      // Render the diagram
      const id = `diagram-${Date.now()}`;
      const { svg } = await mermaid.render(id, diagramCode);
      
      // Create element mapping for click-to-highlight
      const elementMap = new Map();
      const lines = diagramCode.split('\n');
      
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
      
      // Only update if SVG actually changed to prevent infinite re-renders
      if (renderedSvg !== svg) {
        setRenderedSvg(svg);
        setElementMap(elementMap);
        
        onRenderComplete?.({
          svg,
          elementMap
        });
      }
      setIsRendering(false);
      
    } catch (error: any) {
      // Parse Mermaid error for better user feedback
      const errorMessage = error.message || 'Unknown rendering error';
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : 1;
      
      const errorObj: DiagramError = {
        line,
        message: errorMessage,
        type: 'render',
        suggestion: getSuggestionForError(errorMessage)
      };
      
      setError(errorObj);
      setRenderedSvg(null);
      setIsRendering(false);
      onError?.(errorObj);
    }
  }, [loadMermaid, onError, onRenderComplete]);
  
  /**
   * Helper function to provide error suggestions
   */
  const getSuggestionForError = (message: string): string => {
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
  };

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
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
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
          id: element.id,
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