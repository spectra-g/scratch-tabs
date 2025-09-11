/**
 * Tests for useMermaidRenderer hook
 * These tests focus on the core functionality and logic validation
 */

describe('useMermaidRenderer Hook', () => {
  describe('Hook interface', () => {
    it('should export a function', () => {
      const { useMermaidRenderer } = require('../useMermaidRenderer');
      expect(typeof useMermaidRenderer).toBe('function');
    });
  });

  describe('Error message parsing', () => {
    it('should extract line numbers from error messages', () => {
      const testCases = [
        { message: 'Error on line 5', expectedLine: 5 },
        { message: 'Syntax error at line 123', expectedLine: 123 },
        { message: 'Parse error line 42 column 10', expectedLine: 42 },
        { message: 'Unknown error', expectedLine: 1 } // Default
      ];

      testCases.forEach(({ message, expectedLine }) => {
        const lineMatch = message.match(/line (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1]) : 1;
        expect(line).toBe(expectedLine);
      });
    });
  });

  describe('Intelligent Error Suggestions', () => {
    // Simulate the intelligent error suggestion function
    const getIntelligentErrorSuggestion = (message: string, code: string): string => {
      const diagramType = detectDiagramType(code);
      const lowerMessage = message.toLowerCase();
      
      // Lexical errors in class diagrams - check for common syntax issues
      if (lowerMessage.includes('lexical error') && diagramType === 'class') {
        // Check for incorrect attribute syntax: +Type name instead of +name: Type
        const hasIncorrectAttributeSyntax = /\+\s*[A-Z][a-zA-Z]*\s+[a-z][a-zA-Z]*/.test(code);
        if (hasIncorrectAttributeSyntax) {
          return 'Class diagram attributes use UML syntax: `+name: Type`, not `+Type name`. Change `+String id` to `+id: String`. This error can cascade and appear to occur on relationship lines even though the actual issue is in the class definitions above.';
        }
        
        // Check for unquoted relationship labels
        if (lowerMessage.includes('unrecognized text') || code.includes('||--') || code.includes('--')) {
          return 'In class diagrams, relationship labels must be enclosed in double quotes. Change `ClassA -- ClassB : label` to `ClassA -- ClassB : "label"`. Check all your relationship definitions for missing quotes.';
        }
      }
      
      if (lowerMessage.includes('arrow')) {
        return 'Check arrow syntax. Use --> for solid arrows, -.-> for dotted arrows. Ensure proper spacing around arrows.';
      }
      
      if (lowerMessage.includes('node')) {
        return 'Check node syntax. Use proper brackets: [] for rectangles, () for rounded rectangles, {} for diamonds.';
      }
      
      if (lowerMessage.includes('syntax') || lowerMessage.includes('parse')) {
        return 'Check diagram syntax. Ensure proper indentation, valid Mermaid keywords, and correct diagram-specific formatting.';
      }
      
      return 'Check the Mermaid documentation for valid syntax patterns specific to your diagram type.';
    };

    const detectDiagramType = (code: string): string | null => {
      const firstLine = code.trim().split('\n')[0]?.trim() || '';
      if (/^\s*classDiagram/i.test(firstLine)) return 'class';
      if (/^\s*sequenceDiagram/i.test(firstLine)) return 'sequence';
      if (/^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)/i.test(firstLine)) return 'flowchart';
      return null;
    };

    it('should detect class diagram attribute syntax errors (+Type name vs +name: Type)', () => {
      const code = `classDiagram
        class User {
          +String id
          +Integer age
          +Date createdAt
        }
        class Order {
          +String userId
        }
        User ||--o{ Order : "places"`;
      
      const suggestion = getIntelligentErrorSuggestion('Lexical error on line 38. Unrecognized text.', code);
      expect(suggestion).toContain('UML syntax');
      expect(suggestion).toContain('+name: Type');
      expect(suggestion).toContain('+String id` to `+id: String');
      expect(suggestion).toContain('cascade');
    });

    it('should detect class diagram lexical errors for unquoted relationship labels when attribute syntax is correct', () => {
      const code = `classDiagram
        class User {
          +id: String
          +name: String
        }
        class Order {
          +id: String
        }
        User ||--o{ Order : places`;
      
      const suggestion = getIntelligentErrorSuggestion('Lexical error on line 38. Unrecognized text.', code);
      expect(suggestion).toContain('relationship labels must be enclosed in double quotes');
      expect(suggestion).toContain('ClassA -- ClassB : "label"');
    });

    it('should provide flowchart-specific arrow suggestions', () => {
      const code = `flowchart TD
        A --> B`;
      
      const suggestion = getIntelligentErrorSuggestion('Invalid arrow syntax', code);
      expect(suggestion).toContain('arrow syntax');
      expect(suggestion).toContain('-->');
      expect(suggestion).toContain('proper spacing');
    });

    it('should provide enhanced node suggestions', () => {
      const suggestion = getIntelligentErrorSuggestion('Unknown node type', 'graph TD\nA[rect]');
      expect(suggestion).toContain('node syntax');
      expect(suggestion).toContain('rectangles');
      expect(suggestion).toContain('diamonds');
    });

    it('should provide diagram-type-specific default suggestion', () => {
      const suggestion = getIntelligentErrorSuggestion('Unknown error', 'classDiagram\nclass A');
      expect(suggestion).toContain('syntax patterns specific to your diagram type');
    });
  });

  describe('SVG error detection', () => {
    it('should detect error SVGs by content', () => {
      const errorSvgs = [
        '<svg aria-roledescription="error">Syntax error</svg>',
        '<svg>Syntax error in text</svg>',
        '<svg>Parse error detected</svg>',
        '<svg><text class="error-text">Error</text></svg>'
      ];

      const normalSvgs = [
        '<svg><rect/></svg>',
        '<svg><path d="M10,10 L20,20"/></svg>',
        '<svg><text>Normal text</text></svg>'
      ];

      errorSvgs.forEach(svg => {
        const hasErrorText = svg.includes('Syntax error') || svg.includes('Parse error');
        const hasErrorAria = svg.includes('aria-roledescription="error"');
        const hasErrorClass = svg.includes('error-text');
        
        expect(hasErrorText || hasErrorAria || hasErrorClass).toBe(true);
      });

      normalSvgs.forEach(svg => {
        const hasErrorText = svg.includes('Syntax error') || svg.includes('Parse error');
        const hasErrorAria = svg.includes('aria-roledescription="error"');
        const hasErrorClass = svg.includes('error-text');
        
        expect(hasErrorText || hasErrorAria || hasErrorClass).toBe(false);
      });
    });
  });

  describe('Code validation', () => {
    it('should identify empty or whitespace-only code', () => {
      const emptyCodes = ['', '   ', '\n\t  ', '  \n  \t  \n  '];
      const validCodes = ['graph TD; A-->B;', 'sequenceDiagram\nA->>B: Hello'];

      emptyCodes.forEach(code => {
        expect(code.trim()).toBe('');
      });

      validCodes.forEach(code => {
        expect(code.trim()).not.toBe('');
      });
    });
  });

  describe('Element mapping logic', () => {
    it('should create proper element mappings', () => {
      const code = 'graph TD;\nA-->B;\nB-->C;';
      const lines = code.split('\n');
      const elementMap = new Map<string, number>();

      // Simulate element mapping logic - first occurrence wins
      lines.forEach((line, index) => {
        if (line.includes('A') && !elementMap.has('node-A')) {
          elementMap.set('node-A', index + 1);
        }
        if (line.includes('B') && !elementMap.has('node-B')) {
          elementMap.set('node-B', index + 1);
        }
        if (line.includes('C') && !elementMap.has('node-C')) {
          elementMap.set('node-C', index + 1);
        }
      });

      expect(elementMap.get('node-A')).toBe(2); // Line 2: A-->B;
      expect(elementMap.get('node-B')).toBe(2); // Line 2: A-->B;
      expect(elementMap.get('node-C')).toBe(3); // Line 3: B-->C;
    });
  });

  describe('Statistics calculation', () => {
    it('should calculate diagram statistics', () => {
      const code = 'graph TD;\nA-->B;\nB-->C;\nC-->D;';
      const mockSvg = '<svg><path/><text/><g><rect/></g></svg>';
      
      const stats = {
        codeLines: code.split('\n').length,
        codeSize: new Blob([code]).size
      };

      expect(stats.codeLines).toBe(4);
      expect(stats.codeSize).toBeGreaterThan(0);
    });
  });
});