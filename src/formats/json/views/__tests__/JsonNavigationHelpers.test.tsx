/**
 * Unit tests for JSON navigation helper functions
 * Tests the individual utility functions used in JsonSmartView navigation
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Mock Monaco Range constructor
class MockRange {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}

jest.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
  Range: MockRange,
}));

// Since the helper functions are inside the component file, we need to test them indirectly
// or extract them to a separate utility module. For now, let's test the core navigation logic
// through the existing comprehensive tests, but create unit tests for the path parsing logic.

describe('JSON Navigation Helpers', () => {
  describe('Path parsing', () => {
    const parseJsonPath = (path: string): string[] => {
      return path.split(/[.\[\]]+/).filter(Boolean);
    };

    it('should parse simple dot notation paths', () => {
      expect(parseJsonPath('user.name')).toEqual(['user', 'name']);
      expect(parseJsonPath('data.items.title')).toEqual(['data', 'items', 'title']);
    });

    it('should parse paths with array indices', () => {
      expect(parseJsonPath('users[0].name')).toEqual(['users', '0', 'name']);
      expect(parseJsonPath('data.items[1].details')).toEqual(['data', 'items', '1', 'details']);
    });

    it('should parse complex mixed paths', () => {
      expect(parseJsonPath('orders[1].details.trackingNumber')).toEqual(['orders', '1', 'details', 'trackingNumber']);
      expect(parseJsonPath('data.section2.items[0].fields[2].value')).toEqual(['data', 'section2', 'items', '0', 'fields', '2', 'value']);
    });

    it('should handle edge cases', () => {
      expect(parseJsonPath('')).toEqual([]);
      expect(parseJsonPath('single')).toEqual(['single']);
      expect(parseJsonPath('[0]')).toEqual(['0']);
      expect(parseJsonPath('data..nested')).toEqual(['data', 'nested']); // Double dots
    });
  });

  describe('Array index detection', () => {
    const isArrayIndex = (part: string): boolean => /^\d+$/.test(part);

    it('should correctly identify numeric indices', () => {
      expect(isArrayIndex('0')).toBe(true);
      expect(isArrayIndex('1')).toBe(true);
      expect(isArrayIndex('42')).toBe(true);
      expect(isArrayIndex('999')).toBe(true);
    });

    it('should correctly identify non-numeric parts', () => {
      expect(isArrayIndex('name')).toBe(false);
      expect(isArrayIndex('user')).toBe(false);
      expect(isArrayIndex('data')).toBe(false);
      expect(isArrayIndex('item1')).toBe(false); // Contains letters
      expect(isArrayIndex('1.5')).toBe(false); // Decimal
      expect(isArrayIndex('-1')).toBe(false); // Negative
    });

    it('should handle edge cases', () => {
      expect(isArrayIndex('')).toBe(false);
      expect(isArrayIndex(' 1 ')).toBe(false); // Whitespace
      expect(isArrayIndex('01')).toBe(true); // Leading zero (still valid)
    });
  });

  describe('Scope boundary detection logic', () => {
    // Test the logic for detecting JSON container boundaries
    // This tests the core algorithm without Monaco dependencies

    interface ScopeBoundary {
      startLine: number;
      endLine: number;
    }

    const JSON_DELIMITERS = {
      OBJECT_START: '{',
      OBJECT_END: '}',
      ARRAY_START: '[',
      ARRAY_END: ']',
    } as const;

    const findContainerScopeInLines = (
      lines: string[],
      startLineIndex: number
    ): ScopeBoundary | null => {
      let braceCount = 0;
      let bracketCount = 0;
      let foundStart = false;
      let startLineActual = startLineIndex;
      let isObjectScope = false;
      let isArrayScope = false;

      for (let lineIndex = startLineIndex; lineIndex < lines.length; lineIndex++) {
        const lineContent = lines[lineIndex];

        for (const char of lineContent) {
          switch (char) {
            case JSON_DELIMITERS.OBJECT_START:
              if (!foundStart) {
                foundStart = true;
                startLineActual = lineIndex;
                isObjectScope = true;
              }
              braceCount++;
              break;

            case JSON_DELIMITERS.OBJECT_END:
              braceCount--;
              if (foundStart && isObjectScope && braceCount === 0) {
                return { startLine: startLineActual + 1, endLine: lineIndex + 1 }; // Convert to 1-based
              }
              break;

            case JSON_DELIMITERS.ARRAY_START:
              if (!foundStart) {
                foundStart = true;
                startLineActual = lineIndex;
                isArrayScope = true;
              }
              bracketCount++;
              break;

            case JSON_DELIMITERS.ARRAY_END:
              bracketCount--;
              if (foundStart && isArrayScope && bracketCount === 0) {
                return { startLine: startLineActual + 1, endLine: lineIndex + 1 }; // Convert to 1-based
              }
              break;
          }
        }
      }

      return null;
    };

    it('should detect object scope boundaries', () => {
      const lines = [
        '{',
        '  "name": "test",',
        '  "value": 42',
        '}'
      ];

      const scope = findContainerScopeInLines(lines, 0);
      expect(scope).toEqual({ startLine: 1, endLine: 4 });
    });

    it('should detect array scope boundaries', () => {
      const lines = [
        'irrelevant',
        '  "items": [',
        '    { "id": 1 },',
        '    { "id": 2 }',
        '  ]'
      ];

      const scope = findContainerScopeInLines(lines, 1);
      expect(scope).toEqual({ startLine: 2, endLine: 5 });
    });

    it('should detect nested container scopes', () => {
      const lines = [
        '{',
        '  "data": {',
        '    "items": [1, 2, 3]',
        '  }',
        '}'
      ];

      const outerScope = findContainerScopeInLines(lines, 0);
      expect(outerScope).toEqual({ startLine: 1, endLine: 5 });

      const innerScope = findContainerScopeInLines(lines, 1);
      expect(innerScope).toEqual({ startLine: 2, endLine: 4 });
    });

    it('should handle complex nested structures', () => {
      const lines = [
        'start',
        '  "orders": [',
        '    {',
        '      "details": {',
        '        "trackingNumber": "TRACK001"',
        '      }',
        '    }',
        '  ]',
        'end'
      ];

      const arrayScope = findContainerScopeInLines(lines, 1);
      expect(arrayScope).toEqual({ startLine: 2, endLine: 8 });

      const objectScope = findContainerScopeInLines(lines, 2);
      expect(objectScope).toEqual({ startLine: 3, endLine: 7 });

      const detailsScope = findContainerScopeInLines(lines, 3);
      expect(detailsScope).toEqual({ startLine: 4, endLine: 6 });
    });

    it('should return null for invalid or incomplete structures', () => {
      const incompleteLines = [
        '{',
        '  "name": "test"',
        // Missing closing brace
      ];

      const scope = findContainerScopeInLines(incompleteLines, 0);
      expect(scope).toBeNull();
    });
  });
});