import {
  detectDiagramType,
  parseMermaidError,
  validateMermaidCode,
  optimizeMermaidCode,
  extractDiagramMetadata
} from '../utils/mermaidUtils';

describe('mermaidUtils', () => {
  describe('detectDiagramType', () => {
    it('should detect flowchart diagrams', () => {
      expect(detectDiagramType('flowchart TD\n    A --> B')).toBe('flowchart');
      expect(detectDiagramType('graph LR\n    A --> B')).toBe('flowchart');
    });

    it('should detect sequence diagrams', () => {
      expect(detectDiagramType('sequenceDiagram\n    A->>B: Message')).toBe('sequence');
    });

    it('should detect gantt charts', () => {
      expect(detectDiagramType('gantt\n    title Project Timeline')).toBe('gantt');
    });

    it('should detect class diagrams', () => {
      expect(detectDiagramType('classDiagram\n    class User')).toBe('class');
    });

    it('should default to flowchart for unknown types', () => {
      expect(detectDiagramType('unknown diagram type')).toBe('flowchart');
      expect(detectDiagramType('')).toBe('flowchart');
    });

    it('should be case insensitive', () => {
      expect(detectDiagramType('FLOWCHART TD\n    A --> B')).toBe('flowchart');
      expect(detectDiagramType('SequenceDiagram\n    A->>B: Message')).toBe('sequence');
    });
  });

  describe('parseMermaidError', () => {
    it('should parse line numbers from error messages', () => {
      const error = new Error('Parse error on line 5: Invalid syntax');
      const result = parseMermaidError(error, 'test code');

      expect(result.line).toBe(5);
      expect(result.message).toContain('Invalid syntax');
      expect(result.type).toBe('render');
    });

    it('should detect syntax errors', () => {
      const error = new Error('Syntax error: Invalid arrow');
      const result = parseMermaidError(error, 'test code');

      expect(result.type).toBe('syntax');
      expect(result.suggestion).toContain('arrow syntax');
    });

    it('should detect semantic errors', () => {
      const error = new Error('Semantic error: Invalid node reference');
      const result = parseMermaidError(error, 'test code');

      expect(result.type).toBe('semantic');
      expect(result.suggestion).toBeDefined();
    });

    it('should provide helpful suggestions for common errors', () => {
      const arrowError = new Error('Invalid arrow syntax');
      const arrowResult = parseMermaidError(arrowError, 'test code');
      expect(arrowResult.suggestion).toContain('arrow');

      const nodeError = new Error('Invalid node syntax');
      const nodeResult = parseMermaidError(nodeError, 'test code');
      expect(nodeResult.suggestion).toContain('node');
    });

    it('should handle errors without line numbers', () => {
      const error = new Error('General error message');
      const result = parseMermaidError(error, 'test code');

      expect(result.line).toBe(1);
      expect(result.message).toBe('General error message');
    });
  });

  describe('validateMermaidCode', () => {
    it('should return null for valid code', () => {
      const validCode = 'flowchart TD\n    A --> B\n    B --> C';
      expect(validateMermaidCode(validCode)).toBeNull();
    });

    it('should return null for empty code', () => {
      expect(validateMermaidCode('')).toBeNull();
      expect(validateMermaidCode('   ')).toBeNull();
    });

    it('should detect invalid arrow syntax', () => {
      const invalidCode = 'flowchart TD\n    A -> B'; // Should be -->
      const result = validateMermaidCode(invalidCode);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('syntax');
      expect(result?.message).toContain('arrow syntax');
      expect(result?.line).toBe(2);
    });

    it('should detect unmatched brackets', () => {
      const invalidCode = 'flowchart TD\n    A[Start --> B';
      const result = validateMermaidCode(invalidCode);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('syntax');
      expect(result?.message).toContain('brackets');
      expect(result?.line).toBe(2);
    });

    it('should handle multiple bracket types', () => {
      const validCode = 'flowchart TD\n    A[Rect] --> B(Round)\n    B --> C{Diamond}';
      expect(validateMermaidCode(validCode)).toBeNull();
    });
  });

  describe('optimizeMermaidCode', () => {
    it('should remove comments and extra whitespace', () => {
      const messyCode = `flowchart TD
        %% This is a comment
        A --> B
        
        %% Another comment
        B --> C
        
        `;
      
      const optimized = optimizeMermaidCode(messyCode);
      
      expect(optimized).toBe('flowchart TD\nA --> B\nB --> C');
      expect(optimized).not.toContain('%%');
      expect(optimized).not.toContain('        '); // No extra spaces
    });

    it('should preserve meaningful whitespace in node labels', () => {
      const code = 'flowchart TD\n    A["Multi word label"] --> B';
      const optimized = optimizeMermaidCode(code);
      
      expect(optimized).toContain('Multi word label');
    });

    it('should handle empty input', () => {
      expect(optimizeMermaidCode('')).toBe('');
      expect(optimizeMermaidCode('   ')).toBe('');
    });

    it('should handle code with only comments', () => {
      const commentOnlyCode = '%% Comment 1\n%% Comment 2';
      expect(optimizeMermaidCode(commentOnlyCode)).toBe('');
    });
  });

  describe('extractDiagramMetadata', () => {
    it('should extract basic metadata from flowchart', () => {
      const code = `flowchart TD
        title My Flowchart
        A --> B
        B --> C
        C --> D`;
      
      const metadata = extractDiagramMetadata(code);
      
      expect(metadata.type).toBe('flowchart');
      expect(metadata.title).toBe('My Flowchart');
      expect(metadata.connectionCount).toBe(3);
      expect(metadata.lineCount).toBe(5);
      expect(metadata.complexity).toBe('low');
    });

    it('should extract metadata from sequence diagram', () => {
      const code = `sequenceDiagram
        participant A
        participant B
        A->>B: Message 1
        B->>A: Message 2`;
      
      const metadata = extractDiagramMetadata(code);
      
      expect(metadata.type).toBe('sequence');
      expect(metadata.connectionCount).toBe(2);
    });

    it('should handle diagrams without titles', () => {
      const code = 'flowchart TD\n    A --> B';
      const metadata = extractDiagramMetadata(code);
      
      expect(metadata.title).toBeNull();
      expect(metadata.type).toBe('flowchart');
    });

    it('should calculate complexity correctly', () => {
      const simpleCode = 'flowchart TD\n    A --> B';
      const mediumCode = 'flowchart TD\n' + Array.from({length: 7}, (_, i) => `    ${String.fromCharCode(65 + i)} --> ${String.fromCharCode(66 + i)}`).join('\n');
      const complexCode = 'flowchart TD\n' + Array.from({length: 12}, (_, i) => `    ${String.fromCharCode(65 + i)} --> ${String.fromCharCode(66 + i)}`).join('\n');
      
      expect(extractDiagramMetadata(simpleCode).complexity).toBe('low');
      expect(extractDiagramMetadata(mediumCode).complexity).toBe('medium');
      expect(extractDiagramMetadata(complexCode).complexity).toBe('high');
    });

    it('should handle empty or invalid code', () => {
      const metadata = extractDiagramMetadata('');
      
      expect(metadata.type).toBe('flowchart');
      expect(metadata.title).toBeNull();
      expect(metadata.nodeCount).toBe(0);
      expect(metadata.connectionCount).toBe(0);
    });
  });
});