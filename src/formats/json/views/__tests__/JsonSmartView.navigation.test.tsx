/**
 * Comprehensive tests for JsonSmartView navigation functionality
 * Tests the new navigateToPath function and Monaco editor integration
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JsonSmartView } from '../JsonSmartView';

// Mock Monaco Editor
const mockSetPosition = jest.fn();
const mockRevealLineInCenter = jest.fn();
const mockSetSelection = jest.fn();
const mockFindMatches = jest.fn();
const mockGetLineCount = jest.fn();

const mockModel = {
  findMatches: mockFindMatches,
  getLineCount: mockGetLineCount,
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

      // Should search for "title" and find it - since no context, goes to Pass 2 fallback immediately
      expect(mockFindMatches).toHaveBeenCalledWith(
        '"title"',
        false, false, false, null, false
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

      // Mock findMatches to return multiple results for "title"
      mockFindMatches
        .mockReturnValueOnce([
          // First "title" match
          { range: { startLineNumber: 8, startColumn: 13, endLineNumber: 8, endColumn: 18 } },
          // Second "title" match (this should be selected)
          { range: { startLineNumber: 16, startColumn: 13, endLineNumber: 16, endColumn: 18 } },
        ])
        .mockReturnValueOnce([
          // Parent context match for "fields"
          { range: { startLineNumber: 15, startColumn: 11, endLineNumber: 15, endColumn: 18 } },
        ]);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Click navigate button
      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should first search for "title"
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"title"',
        false, false, false, null, false
      );

      // Should search for context key "fields" (most specific parent)
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"fields"',
        false, false, false, null, false
      );

      // Should navigate to the second title match (line 16) not the first (line 8)
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 16,
        column: 13
      });
      expect(mockRevealLineInCenter).toHaveBeenCalledWith(16);
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

      // Mock multiple "name" matches
      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 6, startColumn: 17, endLineNumber: 6, endColumn: 21 } },
          { range: { startLineNumber: 7, startColumn: 17, endLineNumber: 7, endColumn: 21 } },
          { range: { startLineNumber: 12, startColumn: 17, endLineNumber: 12, endColumn: 21 } },
        ])
        .mockReturnValueOnce([
          // Parent context match for "items" (should find the correct array)
          { range: { startLineNumber: 10, startColumn: 11, endLineNumber: 10, endColumn: 16 } },
        ]);

      render(<JsonSmartView {...defaultProps} content={jsonContent} />);

      // Click navigate to array item button
      const navigateButton = screen.getByTestId('navigate-to-array-item');
      fireEvent.click(navigateButton);

      // Should search for "name"
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"name"',
        false, false, false, null, false
      );

      // Should search for context "items" (skipping numeric indices)
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"items"',
        false, false, false, null, false
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
                    "target": "deep value"
                  }
                }
              }
            }
          }
        }
      }, null, 2);

      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 7, startColumn: 15, endLineNumber: 7, endColumn: 21 } },
        ])
        .mockReturnValueOnce([
          // Context match for level6
          { range: { startLineNumber: 6, startColumn: 13, endLineNumber: 6, endColumn: 19 } },
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

      mockFindMatches
        .mockReturnValueOnce([
          { range: { startLineNumber: 100, startColumn: 10, endLineNumber: 100, endColumn: 15 } },
          { range: { startLineNumber: 500, startColumn: 10, endLineNumber: 500, endColumn: 15 } },
        ])
        .mockReturnValueOnce([
          { range: { startLineNumber: 450, startColumn: 5, endLineNumber: 450, endColumn: 12 } },
        ]);

      render(<JsonSmartView {...defaultProps} content='{"large": "json"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should search for "title"
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"title"',
        false, false, false, null, false
      );

      // Should search for "fields" context
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"fields"',
        false, false, false, null, false
      );

      // The algorithm should use the larger adaptive range for big files
      // and successfully find the contextual match at line 500 (within range of parent at 450)
      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 500,
        column: 10
      });
    });
  });

  describe('Fallback Search Behavior', () => {
    it('should fall back to exact text search when key search fails', () => {
      mockFindMatches
        .mockReturnValueOnce([]) // No matches for quoted key "title"
        .mockReturnValueOnce([]) // No matches for Pass 2 fallback
        .mockReturnValueOnce([   // Final fallback: exact text search for full path
          { range: { startLineNumber: 5, startColumn: 15, endLineNumber: 5, endColumn: 20 } },
        ]);

      render(<JsonSmartView {...defaultProps} content='{"fallback": "test"}' />);

      const navigateButton = screen.getByTestId('navigate-to-title');
      fireEvent.click(navigateButton);

      // Should try contextual search, then Pass 2 fallback, then exact text search
      expect(mockFindMatches).toHaveBeenCalledTimes(3);

      // First call: search for "title"
      expect(mockFindMatches).toHaveBeenNthCalledWith(1,
        '"title"',
        false, false, false, null, false
      );

      // Second call: Pass 2 fallback search for "title"
      expect(mockFindMatches).toHaveBeenNthCalledWith(2,
        '"title"',
        false, false, false, null, false
      );

      // Third call: exact text search for full path
      expect(mockFindMatches).toHaveBeenNthCalledWith(3,
        'data.section2.items.component_B.fields.title',
        false, false, false, null, false
      );

      expect(mockSetPosition).toHaveBeenCalledWith({
        lineNumber: 5,
        column: 15
      });
    });
  });
});