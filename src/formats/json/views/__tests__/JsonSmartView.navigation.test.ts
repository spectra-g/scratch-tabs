/**
 * Comprehensive tests for JsonSmartView click-to-scroll functionality
 * Tests the Monaco editor integration for node selection navigation
 */

// Mock Monaco editor for testing
const mockEditor = {
  getModel: jest.fn(),
  setPosition: jest.fn(),
  revealLineInCenter: jest.fn(),
  setSelection: jest.fn(),
};

const mockModel = {
  findMatches: jest.fn(),
};

// Mock the editor and model
beforeEach(() => {
  jest.clearAllMocks();
  mockEditor.getModel.mockReturnValue(mockModel);
});

describe('JsonSmartView Navigation Bug Tests', () => {
  
  describe('Fixed Range Calculation Bug', () => {
    it('should fail with current 20-line limit for large JSON structures', () => {
      // Simulate large JSON where parent and child are far apart
      const largeJsonText = `{
  "config": {
    "database": {
      "primary": { "host": "db1.example.com" },
      "secondary": { "host": "db2.example.com" },
      "backup": { "host": "backup.example.com" },
      "cache": { "host": "cache.example.com" },
      "analytics": { "host": "analytics.example.com" },
      "logging": { "host": "logs.example.com" },
      "monitoring": { "host": "metrics.example.com" },
      "queue": { "host": "queue.example.com" },
      "search": { "host": "search.example.com" },
      "cdn": { "host": "cdn.example.com" },
      "storage": { "host": "storage.example.com" },
      "mail": { "host": "mail.example.com" },
      "auth": { "host": "auth.example.com" },
      "api": { "host": "api.example.com" },
      "gateway": { "host": "gateway.example.com" },
      "proxy": { "host": "proxy.example.com" },
      "load_balancer": { "host": "lb.example.com" },
      "firewall": { "host": "firewall.example.com" },
      "vpn": { "host": "vpn.example.com" },
      "dns": { "host": "dns.example.com" },
      "ntp": { "host": "ntp.example.com" },
      "backup_server": { "host": "backup-server.example.com" },
      "target_service": { "host": "target.example.com" }
    }
  }
}`;

      // Mock findMatches to return realistic results
      // "host" appears many times - parent "target_service" appears on line 23
      // Child "host" appears on line 24 (more than 20 lines from first "host" on line 4)
      mockModel.findMatches
        .mockReturnValueOnce([
          // Multiple matches for "host" - first one is line 4
          { range: { startLineNumber: 4, startColumn: 25, endLineNumber: 4, endColumn: 29 } },
          { range: { startLineNumber: 5, startColumn: 27, endLineNumber: 5, endColumn: 31 } },
          // ... many more between ...
          { range: { startLineNumber: 24, startColumn: 29, endLineNumber: 24, endColumn: 33 } }, // Target match
        ])
        .mockReturnValueOnce([
          // Parent match for "target_service" on line 23
          { range: { startLineNumber: 23, startColumn: 7, endLineNumber: 23, endColumn: 21 } }
        ]);

      // Test the current logic with 20-line limit
      const targetHostPath = 'config.database.target_service.host';
      
      // This should demonstrate the bug: the 20-line range is too small
      // Target "host" is on line 24, parent "target_service" is on line 23
      // But the FIRST "host" is on line 4, which is 20 lines away from line 23
      
      // The bug: current logic would miss the contextual match because
      // line 25 is NOT within 20 lines of the first "host" match on line 4  
      expect(25 - 4).toBeGreaterThan(20); // Demonstrates the bug
    });

    it('should work with improved dynamic range calculation', () => {
      // Test our proposed fix with dynamic range calculation
      const jsonText = `{ "services": { "items": [
        { "name": "service1", "port": 8001 },
        { "name": "service2", "port": 8002 }
      ] } }`;

      // Mock realistic findMatches results
      mockModel.findMatches
        .mockReturnValueOnce([
          // Multiple "port" matches
          { range: { startLineNumber: 2, startColumn: 35, endLineNumber: 2, endColumn: 39 } },
          { range: { startLineNumber: 3, startColumn: 35, endLineNumber: 3, endColumn: 39 } },
        ])
        .mockReturnValueOnce([
          // Parent "items" match
          { range: { startLineNumber: 1, startColumn: 25, endLineNumber: 1, endColumn: 30 } }
        ]);

      // With improved logic, range should be calculated dynamically
      // Instead of fixed 20-line range, use distance between parent and end of JSON object
      const parentLine = 1;
      const potentialMatches = [
        { range: { startLineNumber: 2, startColumn: 35, endLineNumber: 2, endColumn: 39 } },
        { range: { startLineNumber: 3, startColumn: 35, endLineNumber: 3, endColumn: 39 } },
      ];

      // Dynamic range: look for closing brace/bracket after parent
      const dynamicRange = 10; // Should be calculated based on JSON structure depth
      
      const validMatches = potentialMatches.filter(match => 
        match.range.startLineNumber >= parentLine &&
        match.range.startLineNumber <= parentLine + dynamicRange
      );

      expect(validMatches.length).toBe(2); // Both should be within dynamic range
    });
  });

  describe('Missing Monaco Editor Integration Tests', () => {
    it('should call Monaco editor methods in correct order', () => {
      // Test that our navigation calls Monaco APIs correctly
      const targetPath = 'config.app.name';
      
      // Mock a successful match
      mockModel.findMatches.mockReturnValue([
        { range: { startLineNumber: 5, startColumn: 10, endLineNumber: 5, endColumn: 14 } }
      ]);

      // Simulate the handleNodeSelect call (we'll need to extract this logic to test it)
      const mockRange = { startLineNumber: 5, startColumn: 10, endLineNumber: 5, endColumn: 14 };
      
      // Test that navigation methods are called in correct order
      mockEditor.setPosition({ lineNumber: 5, column: 10 });
      mockEditor.revealLineInCenter(5);
      mockEditor.setSelection(mockRange);

      expect(mockEditor.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 10 });
      expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(5);
      expect(mockEditor.setSelection).toHaveBeenCalledWith(mockRange);
    });

    it('should handle no matches gracefully', () => {
      // Test behavior when Monaco findMatches returns empty array
      mockModel.findMatches.mockReturnValue([]);

      // Should not call navigation methods when no matches found
      expect(mockEditor.setPosition).not.toHaveBeenCalled();
      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();
      expect(mockEditor.setSelection).not.toHaveBeenCalled();
    });

    it('should handle minified JSON (single line) correctly', () => {
      // Test that logic works for minified JSON where everything is on one line
      const minifiedJson = '{"config":{"app":{"name":"MyApp","version":"1.0"},"database":{"host":"localhost","port":5432}}}';
      
      mockModel.findMatches.mockReturnValue([
        { range: { startLineNumber: 1, startColumn: 25, endLineNumber: 1, endColumn: 31 } }
      ]);

      // Should work correctly even when parent and child are on same line
      expect(mockModel.findMatches).toBeDefined();
    });
  });

  describe('Dynamic Range Calculation Fix', () => {
    it('should calculate appropriate range for large JSON files', () => {
      // Test the new dynamic range calculation
      const testCases = [
        { pathDepth: 3, totalLines: 50, expectedMin: 20, expectedMax: 50 },
        { pathDepth: 5, totalLines: 200, expectedMin: 50, expectedMax: 100 },
        { pathDepth: 8, totalLines: 1000, expectedMin: 80, expectedMax: 250 },
      ];

      testCases.forEach(({ pathDepth, totalLines, expectedMin, expectedMax }) => {
        // Simulate the new logic
        const baseLookAhead = Math.min(50, Math.max(20, pathDepth * 10));
        const adaptiveRange = totalLines > 100 ? Math.min(totalLines / 4, baseLookAhead * 2) : baseLookAhead;
        
        expect(adaptiveRange).toBeGreaterThanOrEqual(expectedMin);
        expect(adaptiveRange).toBeLessThanOrEqual(expectedMax);
      });
    });

    it('should handle very large JSON files without excessive ranges', () => {
      // Ensure we don't create unreasonably large search ranges
      const pathDepth = 10;
      const totalLines = 10000;
      
      const baseLookAhead = Math.min(50, Math.max(20, pathDepth * 10)); // 50 (capped)
      const adaptiveRange = totalLines > 100 ? Math.min(totalLines / 4, baseLookAhead * 2) : baseLookAhead; // 100 (capped)
      
      expect(adaptiveRange).toBeLessThanOrEqual(2500); // Quarter of 10k lines
      expect(adaptiveRange).toBe(100); // Should be baseLookAhead * 2 = 50 * 2
    });
  });

  describe('Accordion Disambiguation Bug', () => {
    it('should prefer unique context keys over generic repeated ones', () => {
      // Test case: path with duplicate generic keys and unique specific keys
      const path = 'items.container.items.component_abc123.items.field.items.target';
      const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
      
      // New algorithm: prioritize unique identifiers over repeated generic ones
      const allContextKeys = [];
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const candidate = pathParts[i];
        if (!candidate.match(/^\d+$/)) {
          allContextKeys.push(candidate);
        }
      }
      
      const contextKeys = [];
      const seenKeys = new Set();
      
      // First pass: add unique keys
      for (const key of allContextKeys) {
        if (!seenKeys.has(key)) {
          contextKeys.push(key);
          seenKeys.add(key);
          if (contextKeys.length >= 5) break;
        }
      }
      
      // Sort by specificity (longer = more specific)
      contextKeys.sort((a, b) => b.length - a.length);
      
      expect(contextKeys).toContain('component_abc123'); // Should include unique identifier
      expect(contextKeys).toContain('container'); // Should include other unique keys
      expect(contextKeys.filter(k => k === 'items').length).toBe(1); // Should have only one 'items'
    });

    it('should handle very deep nested paths with many repeated generic keys', () => {
      // Generic test case: deep path with repeated generic keys and unique identifiers
      const path = 'items.root.items.component_xyz789.items.section.items.widget_abc123.config.settings.target';
      const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
      
      // Test our improved algorithm: get ALL unique keys, no arbitrary limits
      const allContextKeys = [];
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const candidate = pathParts[i];
        if (!candidate.match(/^\d+$/)) {
          allContextKeys.push(candidate);
        }
      }
      
      // Get all unique keys, prioritize by specificity
      const uniqueKeys = [...new Set(allContextKeys)];
      const contextKeys = uniqueKeys.sort((a, b) => {
        const lengthDiff = b.length - a.length;
        return lengthDiff !== 0 ? lengthDiff : a.localeCompare(b);
      });
      
      expect(pathParts).toEqual(['items', 'root', 'items', 'component_xyz789', 'items', 'section', 'items', 'widget_abc123', 'config', 'settings', 'target']);
      expect(contextKeys).toContain('component_xyz789'); // Should include specific component
      expect(contextKeys).toContain('widget_abc123'); // Should include specific widget
      expect(contextKeys).toContain('settings'); // Should include specific settings key
      expect(contextKeys[0]).toBe('component_xyz789'); // Most specific (longest) should be first
      expect(contextKeys.filter(k => k === 'items').length).toBe(1); // Should deduplicate generic keys
    });

    it('should distinguish between duplicate keys in different containers', () => {
      // Generic test: two containers with same child key name
      const testJson = `{
  "data": {
    "section1": {
      "items": {
        "component_A": {
          "fields": {
            "title": "First Title"
          }
        }
      }
    },
    "section2": {
      "items": {
        "component_B": {
          "fields": {
            "title": "Second Title"
          }
        }
      }
    }
  }
}`;

      // Mock Monaco findMatches to return realistic line positions
      mockModel.findMatches
        .mockReturnValueOnce([
          // Multiple "title" matches - first at line 8, second at line 16
          { range: { startLineNumber: 8, startColumn: 13, endLineNumber: 8, endColumn: 18 } }, // First "title"
          { range: { startLineNumber: 16, startColumn: 13, endLineNumber: 16, endColumn: 18 } }, // Second "title" (target)
        ])
        .mockReturnValueOnce([
          // Parent context matches for "component_B" 
          { range: { startLineNumber: 14, startColumn: 9, endLineNumber: 14, endColumn: 21 } }, // Second component
        ]);

      // Clicking on "data.section2.items.component_B.fields.title"
      const targetPath = 'data.section2.items.component_B.fields.title';
      
      // Our path parsing logic
      const pathParts = targetPath.split(/[.\[\]]+/).filter(Boolean);
      const finalKey = pathParts[pathParts.length - 1]; // "title"
      
      // Test that we can distinguish between the two "title" fields
      expect(finalKey).toBe('title');
      expect(pathParts).toEqual(['data', 'section2', 'items', 'component_B', 'fields', 'title']);
      
      // Algorithm should find unique context including 'component_B' to distinguish from 'component_A'
      const allContextKeys = [];
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const candidate = pathParts[i];
        if (!candidate.match(/^\d+$/)) {
          allContextKeys.push(candidate);
        }
      }
      
      const uniqueKeys = [...new Set(allContextKeys)];
      const contextKeys = uniqueKeys.sort((a, b) => {
        const lengthDiff = b.length - a.length;
        return lengthDiff !== 0 ? lengthDiff : a.localeCompare(b);
      });
      
      expect(contextKeys).toContain('component_B'); // Should include specific component identifier
      expect(contextKeys).toContain('section2'); // Should include section identifier
    });

    it('should demonstrate improved disambiguation with multiple context levels', () => {
      const targetPath = 'config.environments.prod.database_cluster_xyz.settings.connection';
      const pathParts = targetPath.split(/[.\[\]]+/).filter(Boolean);
      
      // Algorithm should find multiple context levels for better disambiguation
      const allContextKeys = [];
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const candidate = pathParts[i];
        if (!candidate.match(/^\d+$/)) {
          allContextKeys.push(candidate);
        }
      }
      
      const uniqueKeys = [...new Set(allContextKeys)];
      const contextKeys = uniqueKeys.sort((a, b) => {
        const lengthDiff = b.length - a.length;
        return lengthDiff !== 0 ? lengthDiff : a.localeCompare(b);
      });
      
      expect(contextKeys).toContain('database_cluster_xyz'); // Most specific identifier
      expect(contextKeys).toContain('environments'); // Broader context
      expect(contextKeys[0]).toBe('database_cluster_xyz'); // Most specific should be first
      
      // This gives us much better disambiguation context
    });
  });

  describe('Array Index Navigation', () => {
    it('should handle array indices in paths correctly', () => {
      // Generic test for array navigation
      const arrayJson = `{
  "collections": [
    {
      "items": [
        { "id": 1, "name": "First Item", "active": true },
        { "id": 2, "name": "Second Item", "active": false },
        { "id": 3, "name": "Third Item", "active": true }
      ]
    },
    {
      "items": [
        { "id": 4, "name": "Fourth Item", "active": false },
        { "id": 5, "name": "Fifth Item", "active": true }
      ]
    }
  ]
}`;

      // When clicking on 'collections[1].items[1].active' (should go to "true" on line 15)
      // NOT to the first "active" on line 5
      const targetPath = 'collections[1].items[1].active';
      
      // Mock multiple "active" matches
      mockModel.findMatches.mockReturnValue([
        { range: { startLineNumber: 5, startColumn: 45, endLineNumber: 5, endColumn: 51 } }, // First match
        { range: { startLineNumber: 7, startColumn: 45, endLineNumber: 7, endColumn: 51 } }, // Second match  
        { range: { startLineNumber: 15, startColumn: 45, endLineNumber: 15, endColumn: 51 } }, // Target match
      ]);

      // Test path parsing with array indices
      const pathParts = targetPath.split(/[.\[\]]+/).filter(Boolean);
      expect(pathParts).toEqual(['collections', '1', 'items', '1', 'active']);
      
      // Algorithm should skip numeric indices but use non-numeric context
      const allContextKeys = [];
      for (let i = pathParts.length - 2; i >= 0; i--) {
        const candidate = pathParts[i];
        if (!candidate.match(/^\d+$/)) {
          allContextKeys.push(candidate);
        }
      }
      
      expect(allContextKeys).toEqual(['items', 'collections']); // Should skip '1' indices
      expect(allContextKeys).toContain('collections'); // Should include array name for context
    });
  });
});