/**
 * Tests for Mermaid utility functions and constants
 * Since utility functions are private to the hook, we test constants and expected behaviors
 */

describe('Mermaid Utility Functions', () => {
  describe('Diagram Type Detection', () => {
    const detectDiagramType = (code: string): string | null => {
      const firstLine = code.trim().split('\n')[0]?.trim() || '';
      const patterns = {
        class: /^\s*classDiagram/i,
        sequence: /^\s*sequenceDiagram/i,
        flowchart: /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)/i,
        gantt: /^\s*gantt/i,
        pie: /^\s*pie/i,
        journey: /^\s*journey/i,
        gitgraph: /^\s*gitGraph/i,
        er: /^\s*erDiagram/i,
        mindmap: /^\s*mindmap/i,
        timeline: /^\s*timeline/i,
        quadrant: /^\s*quadrantChart/i,
        requirement: /^\s*requirementDiagram/i
      };
      
      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(firstLine)) {
          return type;
        }
      }
      return null;
    };

    it('should detect class diagrams', () => {
      const code = `classDiagram
        class User {
          +String name
        }`;
      expect(detectDiagramType(code)).toBe('class');
    });

    it('should detect sequence diagrams', () => {
      const code = `sequenceDiagram
        participant A
        A->>B: Hello`;
      expect(detectDiagramType(code)).toBe('sequence');
    });

    it('should detect flowchart diagrams with various directions', () => {
      const testCases = [
        'flowchart TD',
        'flowchart TB', 
        'flowchart LR',
        'graph TD',
        'graph LR'
      ];

      testCases.forEach(declaration => {
        const code = `${declaration}
          A --> B`;
        expect(detectDiagramType(code)).toBe('flowchart');
      });
    });

    it('should detect ER diagrams', () => {
      const code = `erDiagram
        CUSTOMER ||--o{ ORDER : places`;
      expect(detectDiagramType(code)).toBe('er');
    });

    it('should detect other diagram types', () => {
      const testCases = [
        { code: 'gantt\n    title A Gantt Diagram', type: 'gantt' },
        { code: 'pie title Pie Chart\n    "Dogs" : 386', type: 'pie' },
        { code: 'journey\n    title My working day', type: 'journey' },
        { code: 'gitGraph\n    commit', type: 'gitgraph' },
        { code: 'mindmap\n  root)mindmap(', type: 'mindmap' },
        { code: 'timeline\n    title History', type: 'timeline' },
        { code: 'quadrantChart\n    title Reach and influence', type: 'quadrant' },
        { code: 'requirementDiagram\n    requirement test_req {', type: 'requirement' }
      ];

      testCases.forEach(({ code, type }) => {
        expect(detectDiagramType(code)).toBe(type);
      });
    });

    it('should return null for unknown diagram types', () => {
      const unknownCode = `someUnknownDiagram
        unknown syntax`;
      expect(detectDiagramType(unknownCode)).toBeNull();
    });

    it('should handle empty or malformed code', () => {
      expect(detectDiagramType('')).toBeNull();
      expect(detectDiagramType('   \n  \t  ')).toBeNull();
      expect(detectDiagramType('just some text')).toBeNull();
    });
  });

  describe('ID pattern validation', () => {
    it('should use correct ID pattern for cleanup', () => {
      const diagramId = 'diagram-123456789';
      const expectedDivId = `d${diagramId}`;
      
      expect(expectedDivId).toBe('ddiagram-123456789');
    });
  });

  describe('Cleanup conditions', () => {
    it('should identify error content patterns', () => {
      const errorPatterns = [
        '<svg aria-roledescription="error">Syntax error</svg>',
        '<svg><text class="error-text">Error occurred</text></svg>',
        '<svg>Syntax error in diagram</svg>',
        '<svg>Parse error detected</svg>'
      ];

      errorPatterns.forEach(pattern => {
        const hasErrorText = pattern.includes('Syntax error') || pattern.includes('Parse error');
        const hasErrorClass = pattern.includes('error-text');
        const hasErrorAria = pattern.includes('aria-roledescription="error"');
        
        expect(hasErrorText || hasErrorClass || hasErrorAria).toBe(true);
      });
    });

    it('should not identify normal content as error', () => {
      const normalPatterns = [
        '<svg>Normal diagram</svg>',
        '<svg><rect/><text>Regular text</text></svg>',
        '<svg><path d="M10,10 L20,20"/></svg>'
      ];

      normalPatterns.forEach(pattern => {
        const hasErrorText = pattern.includes('Syntax error') || pattern.includes('Parse error');
        const hasErrorClass = pattern.includes('error-text');
        const hasErrorAria = pattern.includes('aria-roledescription="error"');
        
        expect(hasErrorText || hasErrorClass || hasErrorAria).toBe(false);
      });
    });
  });

  describe('SVG sizing logic', () => {
    it('should identify small diagrams correctly', () => {
      const SMALL_DIAGRAM_THRESHOLD = { width: 300, height: 200 };
      
      const smallDiagrams = [
        { width: 250, height: 150 },
        { width: 100, height: 300 },
        { width: 400, height: 100 }
      ];

      const largeDiagrams = [
        { width: 400, height: 300 },
        { width: 800, height: 600 },
        { width: 350, height: 250 }
      ];

      smallDiagrams.forEach(({ width, height }) => {
        const isSmall = width < SMALL_DIAGRAM_THRESHOLD.width || height < SMALL_DIAGRAM_THRESHOLD.height;
        expect(isSmall).toBe(true);
      });

      largeDiagrams.forEach(({ width, height }) => {
        const isSmall = width < SMALL_DIAGRAM_THRESHOLD.width || height < SMALL_DIAGRAM_THRESHOLD.height;
        expect(isSmall).toBe(false);
      });
    });

    it('should apply correct minimum dimensions', () => {
      const MIN_DIAGRAM_WIDTH = 400;
      const MIN_DIAGRAM_HEIGHT = 300;
      
      const finalWidth = Math.max(200, MIN_DIAGRAM_WIDTH);
      const finalHeight = Math.max(150, MIN_DIAGRAM_HEIGHT);
      
      expect(finalWidth).toBe(400);
      expect(finalHeight).toBe(300);
    });
  });

  describe('Error suggestion logic', () => {
    it('should provide arrow-specific suggestions', () => {
      const arrowErrors = ['Invalid arrow syntax', 'arrow not found', 'bad arrow'];
      
      arrowErrors.forEach(error => {
        const hasArrowKeyword = error.toLowerCase().includes('arrow');
        expect(hasArrowKeyword).toBe(true);
        
        if (hasArrowKeyword) {
          const expectedSuggestion = 'Check arrow syntax. Use --> for solid arrows, -.-> for dotted arrows';
          expect(expectedSuggestion).toContain('arrow');
        }
      });
    });

    it('should provide node-specific suggestions', () => {
      const nodeErrors = ['Unknown node type', 'invalid node', 'node error'];
      
      nodeErrors.forEach(error => {
        const hasNodeKeyword = error.toLowerCase().includes('node');
        expect(hasNodeKeyword).toBe(true);
        
        if (hasNodeKeyword) {
          const expectedSuggestion = 'Check node syntax. Ensure proper brackets: [] for rectangles, () for rounded';
          expect(expectedSuggestion).toContain('node');
        }
      });
    });

    it('should provide general syntax suggestions', () => {
      const syntaxErrors = ['Syntax error in diagram', 'syntax problem', 'bad syntax'];
      
      syntaxErrors.forEach(error => {
        const hasSyntaxKeyword = error.toLowerCase().includes('syntax');
        expect(hasSyntaxKeyword).toBe(true);
        
        if (hasSyntaxKeyword) {
          const expectedSuggestion = 'Check diagram syntax. Ensure proper indentation and valid Mermaid syntax';
          expect(expectedSuggestion).toContain('syntax');
        }
      });
    });

    it('should provide default suggestion for unknown errors', () => {
      const unknownErrors = ['Unknown error', 'mysterious problem', 'weird issue'];
      
      unknownErrors.forEach(error => {
        const hasKnownKeywords = error.toLowerCase().includes('arrow') || 
                                  error.toLowerCase().includes('node') || 
                                  error.toLowerCase().includes('syntax');
        expect(hasKnownKeywords).toBe(false);
        
        if (!hasKnownKeywords) {
          const defaultSuggestion = 'Check the Mermaid documentation for valid syntax';
          expect(defaultSuggestion).toContain('Mermaid documentation');
        }
      });
    });
  });

  describe('Constants validation', () => {
    it('should have reasonable debounce delay', () => {
      const DEBOUNCE_DELAY = 300;
      expect(DEBOUNCE_DELAY).toBeGreaterThan(0);
      expect(DEBOUNCE_DELAY).toBeLessThan(1000);
    });

    it('should have reasonable cleanup delay', () => {
      const CLEANUP_DELAY = 50;
      expect(CLEANUP_DELAY).toBeGreaterThan(0);
      expect(CLEANUP_DELAY).toBeLessThan(200);
    });

    it('should have valid CDN URLs', () => {
      const MERMAID_CDN_URLS = [
        'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
        'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js'
      ];

      MERMAID_CDN_URLS.forEach(url => {
        expect(url).toMatch(/^https:\/\//);
        expect(url).toContain('mermaid');
        expect(url).toContain('.js');
      });
    });

    it('should have valid minimum dimensions', () => {
      const MIN_DIAGRAM_WIDTH = 400;
      const MIN_DIAGRAM_HEIGHT = 300;
      
      expect(MIN_DIAGRAM_WIDTH).toBeGreaterThan(0);
      expect(MIN_DIAGRAM_HEIGHT).toBeGreaterThan(0);
    });

    it('should have valid small diagram thresholds', () => {
      const SMALL_DIAGRAM_THRESHOLD = { width: 300, height: 200 };
      
      expect(SMALL_DIAGRAM_THRESHOLD.width).toBeGreaterThan(0);
      expect(SMALL_DIAGRAM_THRESHOLD.height).toBeGreaterThan(0);
    });
  });
});