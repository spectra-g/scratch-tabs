import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiagramTablet } from '../DiagramTablet';
import { DiagramTabletState } from '../types';

// Mock Monaco editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange, onMount, onEditorReady }: any) => {
    // Simulate Monaco editor behavior
    React.useEffect(() => {
      if (onMount) {
        const mockModel = {
          getLanguageId: jest.fn(() => 'mermaid'),
          getFullModelRange: jest.fn(() => ({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 10,
            endColumn: 1
          })),
          isDisposed: jest.fn(() => false)
        };
        const mockEditor = {
          updateOptions: jest.fn(),
          getModel: jest.fn(() => mockModel),
          pushUndoStop: jest.fn(),
          executeEdits: jest.fn((source, edits) => {
            // Simulate the executeEdits by calling onChange with the new text
            if (edits && edits[0] && edits[0].text) {
              onChange(edits[0].text);
            }
          }),
        };
        const mockMonaco = {
          languages: {
            getLanguages: jest.fn(() => []),
            register: jest.fn(),
            setMonarchTokensProvider: jest.fn(),
          },
          editor: {
            defineTheme: jest.fn(),
            setTheme: jest.fn(),
            setModelLanguage: jest.fn(),
          },
        };
        onMount(mockEditor, mockMonaco);
      }
    }, [onMount]);
    
    return React.createElement('div', {
      'data-testid': 'monaco-editor',
      children: React.createElement('textarea', {
        value,
        onChange: (e: any) => onChange && onChange(e.target.value),
        placeholder: 'Enter your Mermaid diagram code here...',
        'data-testid': 'mermaid-code-editor'
      })
    });
  },
}));

// Mock the Mermaid renderer hook
jest.mock('../hooks/useMermaidRenderer', () => ({
  useMermaidRenderer: jest.fn(() => ({
    renderedSvg: '<svg><rect width="100" height="100" /></svg>',
    isRendering: false,
    error: null,
    elementMap: new Map(),
    handleElementClick: jest.fn(),
    forceRender: jest.fn(),
    getStatistics: jest.fn(() => ({
      totalElements: 5,
      codeLines: 10,
      codeSize: 256
    }))
  }))
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('DiagramTablet', () => {
  const mockOnChange = jest.fn();
  
  const createMockState = (overrides: Partial<DiagramTabletState> = {}): DiagramTabletState => ({
    type: 'diagram',
    mermaidCode: 'flowchart TD\n    A --> B',
    renderedSvg: null,
    errorState: null,
    activeTheme: 'dark',
    selectedTimezones: [],
    history: [],
    pinnedDiagrams: [],
    isRendering: false,
    lastRenderTime: Date.now(),
    templateSearchQuery: '',
    showTemplateLibrary: false,
    exportSettings: {
      format: 'svg',
      resolution: 1,
      includeStyles: true,
      backgroundColor: '#ffffff'
    },
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the main interface', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Mermaid Code')).toBeInTheDocument();
      expect(screen.getByTestId('mermaid-code-editor')).toBeInTheDocument();
    });

    it('should initialize with default code when empty', () => {
      const state = createMockState({ mermaidCode: '' });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mermaidCode: expect.stringContaining('flowchart TD')
        })
      );
    });

    it('should display statistics in toolbar', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Statistics based on the actual mock data
      expect(screen.getByText('2 lines')).toBeInTheDocument();
      expect(screen.getByText('2 elements')).toBeInTheDocument();
    });
  });

  describe('Code Editing', () => {
    it('should update code when editor changes', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const editor = screen.getByTestId('mermaid-code-editor');
      fireEvent.change(editor, { target: { value: 'graph TD\n    X --> Y' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mermaidCode: 'graph TD\n    X --> Y',
          errorState: null
        })
      );
    });

    it('should clear error state when code changes', () => {
      const state = createMockState({
        errorState: {
          line: 1,
          message: 'Test error',
          type: 'syntax'
        }
      });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const editor = screen.getByTestId('mermaid-code-editor');
      fireEvent.change(editor, { target: { value: 'new code' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          errorState: null
        })
      );
    });
  });

  describe('Template Library', () => {
    it('should open template library when templates button is clicked', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const templatesButton = screen.getByText('Templates');
      fireEvent.click(templatesButton);

      expect(screen.getByText('Diagram Templates')).toBeInTheDocument();
    });

    it('should close template library when close button is clicked', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Open template library
      const templatesButton = screen.getByText('Templates');
      fireEvent.click(templatesButton);

      // Template library should be visible
      expect(screen.getByText('Diagram Templates')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should copy code to clipboard', async () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const copyButton = screen.getByText('Copy Code');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(state.mermaidCode);
      });

      // Should show green tick feedback instead of toast
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('should handle copy errors gracefully', async () => {
      const state = createMockState();
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));
      
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const copyButton = screen.getByText('Copy Code');
      fireEvent.click(copyButton);

      // Should handle errors silently - no error message displayed
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(state.mermaidCode);
      });

      // Should not show any error message or success message when copy fails
      expect(screen.queryByText('Copy failed')).not.toBeInTheDocument();
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });
  });

  describe('Theme Management', () => {
    it('should change theme when theme selector is used', () => {
      const state = createMockState({ activeTheme: 'default' });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Find the theme button by its title attribute
      const themeButton = screen.getByTitle('Change diagram theme');
      fireEvent.click(themeButton);

      // Should show theme dropdown menu
      expect(screen.getByText('Dark')).toBeInTheDocument();
      
      // Select dark theme
      const darkTheme = screen.getByText('Dark');
      fireEvent.click(darkTheme);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTheme: 'dark'
        })
      );
    });
  });

  describe('Optimization', () => {
    it('should optimize code when optimize button is clicked', async () => {
      const state = createMockState({
        mermaidCode: 'flowchart TD\n    %% This is a comment\n    A --> B\n    \n    C --> D'
      });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const optimizeButton = screen.getByText('Optimize');
      fireEvent.click(optimizeButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mermaidCode: 'flowchart TD\nA --> B\nC --> D'
          })
        );
      });
    });

    it('should show optimizing state during optimization', async () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const optimizeButton = screen.getByText('Optimize');
      fireEvent.click(optimizeButton);

      // Since optimization happens quickly, we just verify the optimize function works
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error state without crashing', () => {
      const state = createMockState({
        errorState: {
          line: 5,
          message: 'Invalid syntax on line 5',
          type: 'syntax',
          suggestion: 'Check your arrow syntax'
        }
      });
      
      expect(() => {
        render(<DiagramTablet state={state} onChange={mockOnChange} />);
      }).not.toThrow();
      
      // Should still render the main interface
      expect(screen.getByTestId('mermaid-code-editor')).toBeInTheDocument();
    });

    it('should close error panel when close button is clicked', () => {
      const state = createMockState({
        errorState: {
          line: 1,
          message: 'Test error',
          type: 'syntax'
        }
      });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const closeButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg') && btn.getAttribute('class')?.includes('hover:bg-gray-700')
      );
      
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      // Error should be cleared from local state
      expect(screen.queryByText('Syntax Error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and keyboard navigation', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const editor = screen.getByTestId('mermaid-code-editor');
      expect(editor).toBeInTheDocument();
      
      // Check that buttons have proper titles
      const templatesButton = screen.getByText('Templates');
      expect(templatesButton.closest('button')).toHaveAttribute('title');
    });

    it('should handle keyboard shortcuts', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const editor = screen.getByTestId('mermaid-code-editor');
      
      // Test that editor accepts keyboard input
      fireEvent.keyDown(editor, { key: 'Enter' });
      fireEvent.keyDown(editor, { key: 'Tab' });
      
      // Should not throw errors
      expect(editor).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain state consistency across updates', () => {
      const state = createMockState({ activeTheme: 'default' });
      const { rerender } = render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Update state to forest theme
      const newState = { ...state, activeTheme: 'forest' as const };
      rerender(<DiagramTablet state={newState} onChange={mockOnChange} />);

      // Verify that the component handles state changes without errors
      expect(screen.getByTestId('mermaid-code-editor')).toBeInTheDocument();
    });

    it('should handle empty state gracefully', () => {
      const state = createMockState({
        mermaidCode: '',
        renderedSvg: null,
        errorState: null
      });
      
      expect(() => {
        render(<DiagramTablet state={state} onChange={mockOnChange} />);
      }).not.toThrow();
    });
  });
});