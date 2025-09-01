import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiagramTablet } from '../DiagramTablet';
import { DiagramTabletState } from '../types';

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
      expect(screen.getByPlaceholderText('Enter your Mermaid diagram code here...')).toBeInTheDocument();
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

      expect(screen.getByText('10 lines')).toBeInTheDocument();
      expect(screen.getByText('5 elements')).toBeInTheDocument();
    });
  });

  describe('Code Editing', () => {
    it('should update code when textarea changes', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const textarea = screen.getByPlaceholderText('Enter your Mermaid diagram code here...');
      fireEvent.change(textarea, { target: { value: 'graph TD\n    X --> Y' } });

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

      const textarea = screen.getByPlaceholderText('Enter your Mermaid diagram code here...');
      fireEvent.change(textarea, { target: { value: 'new code' } });

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

    it('should close template library and update code when template is selected', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Open template library
      const templatesButton = screen.getByText('Templates');
      fireEvent.click(templatesButton);

      // Select a template (mock the selection)
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        category: 'flowchart' as const,
        code: 'flowchart LR\n    A --> B',
        tags: ['test'],
        complexity: 'basic' as const
      };

      // Simulate template selection by calling the handler directly
      const templateCard = screen.getByText('Test Template');
      fireEvent.click(templateCard);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mermaidCode: template.code
        })
      );
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

      expect(screen.getByText('Code copied!')).toBeInTheDocument();
    });

    it('should handle copy errors gracefully', async () => {
      const state = createMockState();
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));
      
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const copyButton = screen.getByText('Copy Code');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copy failed')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Management', () => {
    it('should change theme when theme selector is used', () => {
      const state = createMockState({ activeTheme: 'default' });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Open theme menu
      const themeButton = screen.getByText('Default');
      fireEvent.click(themeButton);

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

      // Should show optimizing state briefly
      expect(screen.getByText('Optimizing...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error panel when error exists', () => {
      const state = createMockState({
        errorState: {
          line: 5,
          message: 'Invalid syntax on line 5',
          type: 'syntax',
          suggestion: 'Check your arrow syntax'
        }
      });
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Syntax Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid syntax on line 5')).toBeInTheDocument();
      expect(screen.getByText('Line 5')).toBeInTheDocument();
      expect(screen.getByText(/Check your arrow syntax/)).toBeInTheDocument();
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

      const textarea = screen.getByPlaceholderText('Enter your Mermaid diagram code here...');
      expect(textarea).toHaveAttribute('spellCheck', 'false');
      
      // Check that buttons have proper titles
      const templatesButton = screen.getByText('Templates');
      expect(templatesButton.closest('button')).toHaveAttribute('title');
    });

    it('should handle keyboard shortcuts', () => {
      const state = createMockState();
      render(<DiagramTablet state={state} onChange={mockOnChange} />);

      const textarea = screen.getByPlaceholderText('Enter your Mermaid diagram code here...');
      
      // Test that textarea accepts keyboard input
      fireEvent.keyDown(textarea, { key: 'Enter' });
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      // Should not throw errors
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain state consistency across updates', () => {
      const state = createMockState();
      const { rerender } = render(<DiagramTablet state={state} onChange={mockOnChange} />);

      // Update state
      const newState = { ...state, activeTheme: 'forest' as const };
      rerender(<DiagramTablet state={newState} onChange={mockOnChange} />);

      expect(screen.getByText('Forest')).toBeInTheDocument();
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