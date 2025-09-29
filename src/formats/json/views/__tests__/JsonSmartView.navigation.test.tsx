/**
 * Comprehensive tests for JsonSmartView navigation functionality
 * Tests the new navigateToPath function and Monaco editor integration
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock monaco Range constructor (must be defined before jest.mock)
class MockRange {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}

// Mock Monaco Editor
const mockSetPosition = jest.fn();
const mockRevealLineInCenter = jest.fn();
const mockSetSelection = jest.fn();
const mockFindMatches = jest.fn();
const mockGetLineCount = jest.fn();

const mockGetLineContent = jest.fn();
const mockGetLineMaxColumn = jest.fn();

const mockModel = {
  findMatches: mockFindMatches,
  getLineCount: mockGetLineCount,
  getLineContent: mockGetLineContent,
  getLineMaxColumn: mockGetLineMaxColumn,
  getValue: jest.fn().mockReturnValue(''),
  setValue: jest.fn(),
  onDidChangeContent: jest.fn().mockReturnValue({ dispose: jest.fn() }),
};

const mockEditor = {
  setPosition: mockSetPosition,
  revealLineInCenter: mockRevealLineInCenter,
  setSelection: mockSetSelection,
  getModel: jest.fn().mockReturnValue(mockModel),
  getValue: jest.fn().mockReturnValue(''),
  onDidChangeModelContent: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onDidFocusEditorWidget: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  getAction: jest.fn().mockReturnValue({ isSupported: jest.fn().mockReturnValue(false) }),
  trigger: jest.fn(),
};

// Mock Monaco API
jest.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
  Range: MockRange,
}));

jest.mock('@monaco-editor/react', () => ({
  Editor: ({ onMount }: any) => {
    React.useEffect(() => {
      if (onMount) {
        onMount(mockEditor);
      }
    }, [onMount]);
    return <div data-testid="monaco-editor">Mocked Monaco Editor</div>;
  },
}));

import { JsonSmartView } from '../JsonSmartView';

// Mock useRootStore and other dependencies
jest.mock('../../../../stores', () => ({
  useRootStore: () => ({
    addBackgroundTab: jest.fn(),
  }),
}));

jest.mock('../../../../stores/activeEditorStore', () => ({
  useActiveEditorStore: () => ({
    setActiveEditor: jest.fn(),
  }),
}));

jest.mock('../../hooks/useJsonModals', () => ({
  useJsonModals: () => ({
    renderModal: () => null,
  }),
}));

// Mock other components to avoid complex dependencies
jest.mock('../components/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar">Toolbar</div>,
}));

jest.mock('../components/Navigator', () => ({
  Navigator: ({ onNodeSelect }: { onNodeSelect: (path: string) => void }) => (
    <div data-testid="navigator">
      <button
        data-testid="navigate-to-simple"
        onClick={() => onNodeSelect('title')}
      >
        Navigate to simple
      </button>
      <button
        data-testid="navigate-to-title"
        onClick={() => onNodeSelect('data.section2.items.component_B.fields.title')}
      >
        Navigate to title
      </button>
      <button
        data-testid="navigate-to-array-item"
        onClick={() => onNodeSelect('menu.categories[1].items[0].name')}
      >
        Navigate to array item
      </button>
      <button
        data-testid="navigate-to-array-index"
        onClick={() => onNodeSelect('config[0]')}
      >
        Navigate to array index
      </button>
      <button
        data-testid="navigate-to-array-object"
        onClick={() => onNodeSelect('orders[1].details.trackingNumber')}
      >
        Navigate to array object
      </button>
    </div>
  ),
}));

jest.mock('../components/Toolbox', () => ({
  Toolbox: () => <div data-testid="toolbox">Toolbox</div>,
}));

jest.mock('../components/Insights', () => ({
  Insights: () => <div data-testid="insights">Insights</div>,
}));

describe('JsonSmartView Navigation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLineCount.mockReturnValue(100); // Default line count
    mockGetLineContent.mockReturnValue('');
    mockGetLineMaxColumn.mockReturnValue(50);
    // Reset editor mock to return the model
    mockEditor.getModel = jest.fn().mockReturnValue(mockModel);
  });

  const defaultProps = {
    content: '{}',
    onContentChange: jest.fn(),
    tabId: 'test-tab',
    isActive: true,
    side: 'left' as const,
  };

  describe('Simple Navigation', () => {
    it('should navigate to a simple, unique key path correctly', () => {
      const jsonContent = '{"user": {"name": "John"}, "config": {"title": "dark"}}';

      // Mock simple path navigation - no context keys, so direct fallback
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 1, startColumn: 25, endLineNumber: 1, endColumn: 30 } },
        ]);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Find and click the navigator button
      const navigateButton = screen.getByTestId('navigate-to-simple');
      fireEvent.click(navigateButton);

      // Should search for "title" with scoped search (new iterative algorithm)
      expect(mockFindMatches).toHaveBeenCalledWith(
        '"title"',
        expect.objectContaining({
          startLineNumber: 1,
          startColumn: 1,
        }), // Full document range initially
        false, false, null, false
      );

      // Should call navigation methods
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 1,
        column: 25
      });
      expect(mockRevealLineInCenter).toHaveBeenCalledWith(1);
      expect(mockSetSelection).toHaveBeenCalledWith({
        startLineNumber: 1,
        startColumn: 25,
        endLineNumber: 1,
        endColumn: 30
      });
    });
  });

  describe('Duplicate Key Disambiguation (Core Bug Fix)', () => {
    it('should navigate to the correct duplicate key using context', () => {
      const jsonContent = JSON.stringify({
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
      }, null, 2);

      // Mock findMatches for "fields" context search
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 7, startColumn: 11, endLineNumber: 7, endColumn: 18 } },  // First fields (will be selected)
          { range: { startLineNumber: 15, startColumn: 11, endLineNumber: 15, endColumn: 18 } }, // Second fields
        ]);

      // Mock getLineContent for scope detection (will use first fields match at line 7)
      mockGetLineContent
        .mockReturnValueOnce('        "fields": {')    // line 7
        .mockReturnValueOnce('          "title": "First Title"')  // line 8
        .mockReturnValueOnce('        }');             // line 9

      // Mock scoped search for "title" (will find first title)
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 8, startColumn: 13, endLineNumber: 8, endColumn: 18 } },
        ]);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Click navigate button
      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // New algorithm: should first search for "data" (leftmost key in path)
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"data"',
        expect.objectContaining({
          startLineNumber: 1,
        }), // Full document range initially
        false, false, null, false
      );

      // Should then search for "section2" within narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"section2"',
        expect.objectContaining({
          startLineNumber: 7, // Narrowed to data object scope
        }),
        false, false, null, false
      );

      // Should then search for "items" within further narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(3,
        '"items"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should navigate to the first title match (line 8) since no array index specified for fields
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 8,
        column: 13
      });
      expect(mockRevealLineInCenter).toHaveBeenCalledWith(8);
    });
  });

  describe('Array Index Navigation', () => {
    it('should handle array paths correctly and ignore numeric indices for context', () => {
      const jsonContent = JSON.stringify({
        "menu": {
          "categories": [
            {
              "items": [
                { "name": "Item 1" },
                { "name": "Item 2" }
              ]
            },
            {
              "items": [
                { "name": "Target Item" }
              ]
            }
          ]
        }
      }, null, 2);

      // Mock search sequence for new algorithm: menu -> categories -> items -> name
      mockFindMatches
        .mockReturnValueOnce([ // 1. Search for "menu"
          { range: { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 7 } },
        ])
        .mockReturnValueOnce([ // 2. Search for "categories"
          { range: { startLineNumber: 3, startColumn: 5, endLineNumber: 3, endColumn: 15 } },
        ])
        .mockReturnValueOnce([ // 3. Search for "items" (will find 2 matches, use index [1])
          { range: { startLineNumber: 4, startColumn: 11, endLineNumber: 4, endColumn: 16 } },  // First items array
          { range: { startLineNumber: 10, startColumn: 11, endLineNumber: 10, endColumn: 16 } }, // Second items array (target)
        ])
        .mockReturnValueOnce([ // 4. Search for "name" (will find 1 match, use index [0])
          { range: { startLineNumber: 12, startColumn: 17, endLineNumber: 12, endColumn: 21 } },
        ]);

      // Mock getLineCount and getLineContent for scope detection
      mockGetLineCount.mockReturnValue(15);
      mockGetLineContent.mockImplementation((lineNumber: number) => {
        const lineMap: { [key: number]: string } = {
          1: '{',
          2: '  "menu": {',
          3: '    "categories": [',
          4: '      { "items": [',
          5: '        { "name": "Item 1" }',
          6: '      ]',
          7: '      },',
          8: '      {',
          9: '        "items": [',
          10: '          { "name": "Target Item" }',
          11: '        ]',
          12: '      }',
          13: '    ]',
          14: '  }',
          15: '}',
        };
        return lineMap[lineNumber] || '';
      });

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Click navigate to array item button
      const navigateButton = screen.getByTestId('navigate-to-array-item');
      fireEvent.click(navigateButton);

      // New algorithm: should first search for "menu" (leftmost key in path)
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"menu"',
        expect.objectContaining({
          startLineNumber: 1,
        }), // Full document range initially
        false, false, null, false
      );

      // Should then search for "categories" within narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"categories"',
        expect.objectContaining({
          startLineNumber: 2, // Narrowed to menu object scope (lines 2-14)
          endLineNumber: 14,
        }),
        false, false, null, false
      );

      // Should then search for "items" within further narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(3,
        '"items"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should then search for "name" within final narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(4,
        '"name"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should navigate to the contextually correct match
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 12,
        column: 17
      });
    });

    it('should exit early for pure array index paths', () => {
      render(<JsonSmartView {...defaultProps} content='[1, 2, 3]' />);

      // Click navigate to array index button
      const navigateButton = screen.getByTestId('navigate-to-array-index');
      fireEvent.click(navigateButton);

      // Should not call findMatches since the final key is numeric
      expect(mockFindMatches).not.toHaveBeenCalled();
      expect(mockSetPosition).not.toHaveBeenCalled();
    });

    it('should navigate to the correct element in an array of objects', () => {
      // Create JSON that clearly represents the bug scenario
      const jsonContent = JSON.stringify({
        "orders": [
          {
            "details": {
              "trackingNumber": "TRACK001"
            }
          },
          {
            "details": {
              "trackingNumber": "TRACK002"
            }
          }
        ]
      }, null, 2);

      // Mock the iterative descent search sequence:
      // Step 1: Search for "orders" in full document scope
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 10 } }, // "orders" key
        ])
        // Step 2: Search for "details" within orders array scope (should return 2 matches)
        .mockReturnValueOnce([
          { range: { startLineNumber: 4, startColumn: 7, endLineNumber: 4, endColumn: 14 } }, // orders[0].details
          { range: { startLineNumber: 9, startColumn: 7, endLineNumber: 9, endColumn: 14 } }, // orders[1].details
        ])
        // Step 3: Search for "trackingNumber" within the second details object scope
        .mockReturnValueOnce([
          { range: { startLineNumber: 10, startColumn: 9, endLineNumber: 10, endColumn: 23 } }, // orders[1].details.trackingNumber
        ]);

      // Mock getLineContent to handle multiple calls to same lines
      const lineContentMap: { [key: number]: string } = {
        1: '{',
        2: '  "orders": [',
        3: '    {',
        4: '      "details": {',
        5: '        "trackingNumber": "TRACK001"',
        6: '      }',
        7: '    },',
        8: '    {',
        9: '      "details": {',
        10: '        "trackingNumber": "TRACK002"',
        11: '      }',
        12: '    }',
        13: '  ]',
        14: '}'
      };

      mockGetLineContent.mockImplementation((lineNumber: number) => lineContentMap[lineNumber] || '');

      // Mock getLineCount to return the correct number of lines for our JSON
      mockGetLineCount.mockReturnValue(14);

      // Mock getLineMaxColumn for Range construction
      mockGetLineMaxColumn.mockReturnValue(50);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Click the button that triggers orders[1].details.trackingNumber navigation
      const navigateButton = screen.getByTestId('navigate-to-array-object');
      fireEvent.click(navigateButton);

      // Assert the iterative descent sequence:
      // Call 1: Search for "orders" in full document scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"orders"',
        expect.objectContaining({
          startLineNumber: 1,
          startColumn: 1,
        }), // Full document range
        false, false, null, false
      );

      // Call 2: Search for "details" within orders array scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"details"',
        expect.objectContaining({
          startLineNumber: 2,
          endLineNumber: 13,
        }), // Scoped to orders array
        false, false, null, false
      );

      // Call 3: Search for "trackingNumber" within second details object scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(3,
        '"trackingNumber"',
        expect.objectContaining({
          startLineNumber: 9,
          endLineNumber: 11,
        }), // Scoped to orders[1].details object
        false, false, null, false
      );

      // Critical assertion: Navigation goes to orders[1].details.trackingNumber (line 10), not orders[0]
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 10, // Line containing orders[1].details.trackingNumber
        column: 9
      });

      expect(mockRevealLineInCenter).toHaveBeenCalledWith(10);
    });
  });

  describe('Deeply Nested Object Navigation', () => {
    it('should handle 5+ levels of nesting correctly', () => {
      const jsonContent = JSON.stringify({
        "level1": {
          "level2": {
            "level3": {
              "level4": {
                "level5": {
                  "level6": {
                    "title": "deep value"
                  }
                }
              }
            }
          }
        }
      }, null, 2);

      // Mock context search for "level6" (most specific parent)
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 6, startColumn: 13, endLineNumber: 6, endColumn: 19 } },
        ]);

      // Mock getLineContent for scope detection
      mockGetLineContent
        .mockReturnValueOnce('        "level6": {')    // line 6
        .mockReturnValueOnce('          "title": "deep value"')  // line 7
        .mockReturnValueOnce('        }');             // line 8

      // Mock scoped search for "title"
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 7, startColumn: 15, endLineNumber: 7, endColumn: 21 } },
        ]);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Simulate clicking on deeply nested path
      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should handle deep nesting with appropriate search range
      expect(mockFindMatches).toHaveBeenCalled();
      expect(mockSetPosition).toHaveBeenCalled();
    });
  });

  describe('Minified JSON Navigation', () => {
    it('should handle single-line minified JSON correctly', () => {
      const minifiedJson = '{"config":{"app":{"title":"MyApp","version":"1.0"},"database":{"host":"localhost","port":5432}}}';

      mockFindMatches.mockReturnValueOnce([
        { range: { startLineNumber: 1, startColumn: 25, endLineNumber: 1, endColumn: 29 } },
      ]);

      render(<JsonSmartView {...defaultProps} content={minifiedJson} />);

      const navigateButton = screen.getByTestId('navigate-to-simple');
      fireEvent.click(navigateButton);

      // Should work with single-line JSON and use column positions
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 1,
        column: 25
      });
    });
  });

  describe('Graceful Failure Handling', () => {
    it('should handle no matches gracefully', () => {
      mockFindMatches.mockReturnValue([]); // No matches found

      render(<JsonSmartView {...defaultProps} content='{"test": "value"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should search but not navigate when no matches
      expect(mockFindMatches).toHaveBeenCalled();
      expect(mockSetPosition).not.toHaveBeenCalled();
      expect(mockRevealLineInCenter).not.toHaveBeenCalled();
      expect(mockSetSelection).not.toHaveBeenCalled();
    });

    it('should handle null/undefined editor gracefully', () => {
      // Mock getModel to return null
      mockEditor.getModel = jest.fn().mockReturnValue(null);

      render(<JsonSmartView {...defaultProps} content='{"test": "value"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should not crash or call navigation methods
      expect(mockSetPosition).not.toHaveBeenCalled();
      expect(mockRevealLineInCenter).not.toHaveBeenCalled();
      expect(mockSetSelection).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Range Calculation', () => {
    it('should calculate appropriate search ranges for different JSON sizes', () => {
      const testCases = [
        { totalLines: 50, pathDepth: 3, expectedRange: 30 },
        { totalLines: 200, pathDepth: 5, expectedRange: 100 },
        { totalLines: 1000, pathDepth: 8, expectedRange: 160 },
      ];

      testCases.forEach(({ totalLines, pathDepth, expectedRange }) => {
        // Test the dynamic range calculation logic
        const baseLookAhead = Math.min(50, Math.max(20, pathDepth * 10));
        const adaptiveRange = totalLines > 100
          ? Math.min(totalLines / 4, baseLookAhead * 2)
          : baseLookAhead;

        if (totalLines > 100) {
          expect(adaptiveRange).toBeLessThanOrEqual(totalLines / 4);
        } else {
          expect(adaptiveRange).toBe(baseLookAhead);
        }

        expect(adaptiveRange).toBeGreaterThanOrEqual(20);
        expect(adaptiveRange).toBeLessThanOrEqual(250);
      });
    });

    it('should use appropriate range for large files', () => {
      mockGetLineCount.mockReturnValue(1000);

      // Mock search sequence for new algorithm: data -> section2 -> items -> component_B -> fields -> title
      mockFindMatches
        .mockReturnValueOnce([ // 1. Search for "data"
          { range: { startLineNumber: 450, startColumn: 3, endLineNumber: 450, endColumn: 7 } },
        ])
        .mockReturnValueOnce([ // 2. Search for "section2"
          { range: { startLineNumber: 490, startColumn: 5, endLineNumber: 490, endColumn: 13 } },
        ])
        .mockReturnValueOnce([ // 3. Search for "items"
          { range: { startLineNumber: 500, startColumn: 7, endLineNumber: 500, endColumn: 12 } },
        ])
        .mockReturnValueOnce([ // 4. Search for "component_B"
          { range: { startLineNumber: 510, startColumn: 9, endLineNumber: 510, endColumn: 20 } },
        ])
        .mockReturnValueOnce([ // 5. Search for "fields"
          { range: { startLineNumber: 520, startColumn: 11, endLineNumber: 520, endColumn: 17 } },
        ])
        .mockReturnValueOnce([ // 6. Search for "title"
          { range: { startLineNumber: 530, startColumn: 13, endLineNumber: 530, endColumn: 18 } },
        ]);

      // Mock getLineContent for scope detection
      mockGetLineContent.mockImplementation((lineNumber: number) => {
        const lineMap: { [key: number]: string } = {
          449: '{',
          450: '  "data": {',
          490: '    "section2": {',
          500: '      "items": {',
          510: '        "component_B": {',
          520: '          "fields": {',
          530: '            "title": "Large File Title"',
          540: '          }',
          550: '        }',
          560: '      }',
          570: '    }',
          580: '  }',
          581: '}',
        };
        return lineMap[lineNumber] || '';
      });

      render(<JsonSmartView {...defaultProps} content='{"large": "json"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // New algorithm: should first search for "data" (leftmost key in path)
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"data"',
        expect.objectContaining({
          startLineNumber: 1,
        }), // Full document range initially
        false, false, null, false
      );

      // Should then search for "section2" within narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"section2"',
        expect.objectContaining({
          startLineNumber: 450, // Narrowed to data object scope (lines 450-580)
          endLineNumber: 580,
        }),
        false, false, null, false
      );

      // Should then search for "items" within further narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(3,
        '"items"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should then search for "component_B"
      expect(mockFindMatches).toHaveBeenNthCalledWith(4,
        '"component_B"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should then search for "fields"
      expect(mockFindMatches).toHaveBeenNthCalledWith(5,
        '"fields"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // Should then search for "title" within final narrowed scope
      expect(mockFindMatches).toHaveBeenNthCalledWith(6,
        '"title"',
        expect.any(Object), // Scoped search range
        false, false, null, false
      );

      // The algorithm should use the larger adaptive range for big files
      // and successfully find the contextual match at line 530
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 530,
        column: 13
      });
    });
  });

  describe('Fallback Search Behavior', () => {
    it('should handle graceful failure when iterative descent fails', () => {
      // Mock first search to fail (algorithm will terminate)
      mockFindMatches
        .mockReturnValueOnce([]); // No matches for "data" (first key in path)

      render(<JsonSmartView {...defaultProps} content='{"fallback": "test"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // New algorithm: should only try first key search, then stop
      expect(mockFindMatches).toHaveBeenCalledTimes(1);

      // Should search for first key in path "data"
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"data"',
        expect.objectContaining({
          startLineNumber: 1,
        }),
        false, false, null, false
      );

      // No navigation should occur when search fails
      expect(mockSetPosition).not.toHaveBeenCalled();
      expect(mockRevealLineInCenter).not.toHaveBeenCalled();
    });
  });
});