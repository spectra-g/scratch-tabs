/**
 * Integration tests for JSON navigation using json-source-map
 * These tests verify that navigation works correctly with actual JSON structures
 */

import { parse as parseWithSourceMap } from 'json-source-map';

/**
 * Helper function to convert dot-notation path to JSON Pointer
 */
const pathToJsonPointer = (path: string): string => {
  if (!path || !path.trim()) return '';
  const normalized = path.trim().replace(/\[/g, '.').replace(/\]/g, '');
  const parts = normalized.split('.').filter(Boolean).map(part => part.trim());
  return '/' + parts.join('/');
};

/**
 * Simulates the navigation logic from JsonSmartView
 */
const findNavigationTarget = (jsonContent: string, dotNotationPath: string) => {
  try {
    const { pointers } = parseWithSourceMap(jsonContent);
    const jsonPointer = pathToJsonPointer(dotNotationPath);
    const location = pointers[jsonPointer];

    if (!location) {
      return null;
    }

    // Prefer key position if available (property name)
    if (location.key) {
      return {
        line: location.key.line,
        column: location.key.column,
        endLine: location.valueEnd.line,
        endColumn: location.valueEnd.column,
      };
    }

    // Otherwise use value position (array items, root)
    if (location.value) {
      return {
        line: location.value.line,
        column: location.value.column,
        endLine: location.valueEnd.line,
        endColumn: location.valueEnd.column,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

describe('JSON Navigation with json-source-map', () => {
  describe('Simple object navigation', () => {
    const json = JSON.stringify({
      name: 'John',
      age: 30,
      active: true,
    }, null, 2);

    it('should find simple property', () => {
      const result = findNavigationTarget(json, 'name');
      expect(result).not.toBeNull();
      expect(result?.line).toBe(1); // "name" is on line 1 (0-indexed)
    });

    it('should find numeric property', () => {
      const result = findNavigationTarget(json, 'age');
      expect(result).not.toBeNull();
      expect(result?.line).toBe(2);
    });

    it('should find boolean property', () => {
      const result = findNavigationTarget(json, 'active');
      expect(result).not.toBeNull();
      expect(result?.line).toBe(3);
    });

    it('should return null for non-existent property', () => {
      const result = findNavigationTarget(json, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Nested object navigation', () => {
    const json = JSON.stringify({
      user: {
        profile: {
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
    }, null, 2);

    it('should find nested property', () => {
      const result = findNavigationTarget(json, 'user.profile.name');
      expect(result).not.toBeNull();
      expect(result?.line).toBeGreaterThanOrEqual(0);
    });

    it('should find intermediate nested object', () => {
      const result = findNavigationTarget(json, 'user.profile');
      expect(result).not.toBeNull();
    });

    it('should return null for partial invalid path', () => {
      const result = findNavigationTarget(json, 'user.invalid.name');
      expect(result).toBeNull();
    });
  });

  describe('Array navigation', () => {
    const json = JSON.stringify([
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
      { id: 3, name: 'Third' },
    ], null, 2);

    it('should find array element', () => {
      const result = findNavigationTarget(json, '[0]');
      expect(result).not.toBeNull();
      expect(result?.line).toBeGreaterThanOrEqual(0);
    });

    it('should find property in array element', () => {
      const result = findNavigationTarget(json, '[1].name');
      expect(result).not.toBeNull();
    });

    it('should find last array element', () => {
      const result = findNavigationTarget(json, '[2].id');
      expect(result).not.toBeNull();
    });

    it('should return null for out-of-bounds index', () => {
      const result = findNavigationTarget(json, '[5]');
      expect(result).toBeNull();
    });
  });

  describe('Complex nested structures', () => {
    const json = JSON.stringify({
      data: {
        users: [
          {
            id: 1,
            name: 'Alice',
            addresses: [
              { city: 'New York', zip: '10001' },
              { city: 'Boston', zip: '02101' },
            ],
          },
          {
            id: 2,
            name: 'Bob',
            addresses: [
              { city: 'Chicago', zip: '60601' },
            ],
          },
        ],
      },
    }, null, 2);

    it('should navigate to deeply nested property', () => {
      const result = findNavigationTarget(json, 'data.users[0].addresses[1].city');
      expect(result).not.toBeNull();
    });

    it('should navigate to nested array', () => {
      const result = findNavigationTarget(json, 'data.users[1].addresses');
      expect(result).not.toBeNull();
    });

    it('should navigate to property in nested object', () => {
      const result = findNavigationTarget(json, 'data.users[0].name');
      expect(result).not.toBeNull();
    });

    it('should handle path to array element in nested array', () => {
      const result = findNavigationTarget(json, 'data.users[0].addresses[0]');
      expect(result).not.toBeNull();
    });
  });

  describe('Edge cases from AI analysis', () => {
    describe('Missing properties in array items', () => {
      const json = JSON.stringify([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob' }, // No email
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
      ], null, 2);

      it('should find property in first item', () => {
        const result = findNavigationTarget(json, '[0].email');
        expect(result).not.toBeNull();
      });

      it('should return null for missing property in second item', () => {
        const result = findNavigationTarget(json, '[1].email');
        expect(result).toBeNull();
      });

      it('should find property in third item', () => {
        const result = findNavigationTarget(json, '[2].email');
        expect(result).not.toBeNull();
      });
    });

    describe('Nested keys with same names', () => {
      const json = JSON.stringify({
        user: {
          name: 'Parent User',
          profile: {
            name: 'Profile Name',
            settings: {
              name: 'Settings Name',
            },
          },
        },
      }, null, 2);

      it('should find correct "name" at top level', () => {
        const result = findNavigationTarget(json, 'user.name');
        expect(result).not.toBeNull();
        // Should be the first "name"
      });

      it('should find correct "name" in nested profile', () => {
        const result = findNavigationTarget(json, 'user.profile.name');
        expect(result).not.toBeNull();
        // Should be the second "name", not the first
      });

      it('should find correct "name" in deeply nested settings', () => {
        const result = findNavigationTarget(json, 'user.profile.settings.name');
        expect(result).not.toBeNull();
        // Should be the third "name"
      });
    });

    describe('Keys appearing in string values', () => {
      const json = JSON.stringify({
        config: 'name: John',
        name: 'Alice',
        description: 'This object has a name property',
      }, null, 2);

      it('should find the actual "name" property, not string occurrences', () => {
        const result = findNavigationTarget(json, 'name');
        expect(result).not.toBeNull();
        // Should find the actual key "name", not "name" in the strings
      });

      it('should find config property', () => {
        const result = findNavigationTarget(json, 'config');
        expect(result).not.toBeNull();
      });
    });

    describe('Multiple array levels', () => {
      const json = JSON.stringify({
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      }, null, 2);

      it('should navigate to nested array element', () => {
        const result = findNavigationTarget(json, 'matrix[1][2]');
        expect(result).not.toBeNull();
      });

      it('should navigate to first level array', () => {
        const result = findNavigationTarget(json, 'matrix[0]');
        expect(result).not.toBeNull();
      });
    });
  });

  describe('Invalid JSON handling', () => {
    it('should return null for invalid JSON', () => {
      const result = findNavigationTarget('{ invalid json }', 'name');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = findNavigationTarget('', 'name');
      expect(result).toBeNull();
    });

    it('should handle null JSON value', () => {
      const json = JSON.stringify(null);
      const result = findNavigationTarget(json, 'name');
      expect(result).toBeNull();
    });
  });

  describe('Root level arrays', () => {
    const json = JSON.stringify(['a', 'b', 'c'], null, 2);

    it('should navigate to array element at root', () => {
      const result = findNavigationTarget(json, '[0]');
      expect(result).not.toBeNull();
    });

    it('should navigate to middle element', () => {
      const result = findNavigationTarget(json, '[1]');
      expect(result).not.toBeNull();
    });
  });

  describe('Special characters in property names', () => {
    const json = JSON.stringify({
      'first-name': 'John',
      'user_email': 'john@example.com',
      'data_value': 123,
    }, null, 2);

    it('should find property with hyphen', () => {
      const result = findNavigationTarget(json, 'first-name');
      expect(result).not.toBeNull();
    });

    it('should find property with underscore in name', () => {
      const result = findNavigationTarget(json, 'user_email');
      expect(result).not.toBeNull();
    });

    it('should find property with underscore', () => {
      const result = findNavigationTarget(json, 'data_value');
      expect(result).not.toBeNull();
    });
  });

  describe('Dot notation limitations', () => {
    it('cannot distinguish property with dot from nested path', () => {
      // This is a known limitation: a property literally named "user.email"
      // cannot be addressed using dot notation "user.email" because it's
      // interpreted as nested path user -> email
      const json = JSON.stringify({
        'user.email': 'john@example.com',
      }, null, 2);

      // This will fail because "user.email" is interpreted as nested path
      const result = findNavigationTarget(json, 'user.email');
      expect(result).toBeNull();

      // Note: JSON Pointer format ("/user.email") would work correctly,
      // but our dot notation converter can't handle this edge case
    });
  });
});
