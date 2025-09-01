import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SvgViewer } from '../views/components/SvgViewer';
import { SmartViewProps } from '../../../views/registry';

// Mock the optimizer utilities
jest.mock('../utils/optimizer', () => ({
  optimizeWithSvgo: jest.fn().mockResolvedValue('<svg><rect /></svg>'),
  basicCleanup: jest.fn().mockReturnValue('<svg><rect /></svg>'),
  validateSvg: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  extractSvgMetadata: jest.fn().mockReturnValue({ complexityScore: 5 }),
  generateOptimizationSuggestions: jest.fn().mockReturnValue([]),
}));

// Mock the active editor store
jest.mock('../../../stores/activeEditorStore', () => ({
  useActiveEditorStore: jest.fn(() => ({
    activeLeftEditor: {
      getModel: jest.fn(() => ({
        isDisposed: jest.fn(() => false),
        getValue: jest.fn(() => '<svg><rect /></svg>'),
      })),
      setSelection: jest.fn(),
      revealLineInCenter: jest.fn(),
      focus: jest.fn(),
    },
    activeRightEditor: null,
  })),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('SvgViewer', () => {
  const defaultProps: SmartViewProps = {
    content: '<svg width="100" height="100"><rect x="10" y="10" width="50" height="50" fill="blue" data-id="svg-element-0" /></svg>',
    onContentChange: jest.fn(),
    tabId: 'test-tab',
    isActive: true,
    side: 'left',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render SVG preview with toolbar', () => {
      render(<SvgViewer {...defaultProps} />);
      
      expect(screen.getByText('SVG Preview')).toBeInTheDocument();
      expect(screen.getByTitle('Optimize with SVGO (Advanced)')).toBeInTheDocument();
      expect(screen.getByTitle('Basic Cleanup (No External Libraries)')).toBeInTheDocument();
    });

    it('should display SVG statistics', () => {
      render(<SvgViewer {...defaultProps} />);
      
      // Should show element count and file size
      expect(screen.getByText(/elements/)).toBeInTheDocument();
      expect(screen.getByText(/paths/)).toBeInTheDocument();
    });

    it('should render empty state when no content', () => {
      render(<SvgViewer {...defaultProps} content="" />);
      
      expect(screen.getByText('No SVG Content')).toBeInTheDocument();
      expect(screen.getByText('Add SVG code to see the preview')).toBeInTheDocument();
    });

    it('should render error state for invalid SVG', () => {
      render(<SvgViewer {...defaultProps} content="<invalid>not svg</invalid>" />);
      
      expect(screen.getByText('Invalid SVG')).toBeInTheDocument();
      expect(screen.getByText('Please check your SVG syntax')).toBeInTheDocument();
    });
  });

  describe('element inspection', () => {
    it('should show inspector panel by default', () => {
      render(<SvgViewer {...defaultProps} />);
      
      expect(screen.getByText('Element Inspector')).toBeInTheDocument();
      expect(screen.getByText('Click any element in the SVG to inspect it')).toBeInTheDocument();
    });

    it('should toggle inspector panel visibility', () => {
      render(<SvgViewer {...defaultProps} />);
      
      const inspectorToggle = screen.getByTitle('Hide Inspector');
      fireEvent.click(inspectorToggle);
      
      expect(screen.queryByText('Element Inspector')).not.toBeInTheDocument();
      
      const showInspectorToggle = screen.getByTitle('Show Inspector');
      fireEvent.click(showInspectorToggle);
      
      expect(screen.getByText('Element Inspector')).toBeInTheDocument();
    });

    it('should handle SVG element clicks', () => {
      render(<SvgViewer {...defaultProps} />);
      
      // Find the SVG container and simulate a click
      const svgContainer = screen.getByRole('generic', { hidden: true });
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {
          closest: jest.fn().mockReturnValue({
            tagName: 'rect',
            getAttribute: jest.fn((attr) => {
              if (attr === 'data-id') return 'svg-element-0';
              if (attr === 'fill') return 'blue';
              return null;
            }),
            id: '',
          }),
        },
      };
      
      // Simulate click event
      fireEvent.click(svgContainer, mockEvent as any);
      
      // Should show element information
      expect(screen.getByText('<rect>')).toBeInTheDocument();
    });
  });

  describe('optimization', () => {
    it('should handle SVGO optimization', async () => {
      const mockOnContentChange = jest.fn();
      render(<SvgViewer {...defaultProps} onContentChange={mockOnContentChange} />);
      
      const optimizeButton = screen.getByTitle('Optimize with SVGO (Advanced)');
      fireEvent.click(optimizeButton);
      
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith('<svg><rect /></svg>');
      });
    });

    it('should handle basic cleanup', async () => {
      const mockOnContentChange = jest.fn();
      render(<SvgViewer {...defaultProps} onContentChange={mockOnContentChange} />);
      
      const basicButton = screen.getByTitle('Basic Cleanup (No External Libraries)');
      fireEvent.click(basicButton);
      
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith('<svg><rect /></svg>');
      });
    });

    it('should show optimization results', async () => {
      const { optimizeWithSvgo } = require('../utils/optimizer');
      optimizeWithSvgo.mockResolvedValue('<svg><rect /></svg>');
      
      render(<SvgViewer {...defaultProps} />);
      
      const optimizeButton = screen.getByTitle('Optimize with SVGO (Advanced)');
      fireEvent.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Optimized:/)).toBeInTheDocument();
      });
    });

    it('should disable optimization buttons while optimizing', () => {
      render(<SvgViewer {...defaultProps} />);
      
      const optimizeButton = screen.getByTitle('Optimize with SVGO (Advanced)');
      const basicButton = screen.getByTitle('Basic Cleanup (No External Libraries)');
      
      fireEvent.click(optimizeButton);
      
      expect(optimizeButton).toBeDisabled();
      expect(basicButton).toBeDisabled();
    });
  });

  describe('export functionality', () => {
    it('should copy SVG to clipboard', async () => {
      render(<SvgViewer {...defaultProps} />);
      
      const copyButton = screen.getByTitle('Copy SVG Code');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.content);
      });
    });

    it('should export SVG as file', () => {
      // Mock document methods
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      const mockCreateElement = jest.fn(() => ({
        href: '',
        download: '',
        click: mockClick,
      }));
      
      document.createElement = mockCreateElement;
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;
      
      render(<SvgViewer {...defaultProps} />);
      
      const exportButton = screen.getByTitle('Export as .svg');
      fireEvent.click(exportButton);
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('zoom and pan controls', () => {
    it('should handle zoom in', () => {
      render(<SvgViewer {...defaultProps} />);
      
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      
      // Zoom percentage should increase
      expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('should handle zoom out', () => {
      render(<SvgViewer {...defaultProps} />);
      
      // First zoom in to have something to zoom out from
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      
      const zoomOutButton = screen.getByTitle('Zoom Out');
      fireEvent.click(zoomOutButton);
      
      // Should be back to 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should reset zoom and pan', () => {
      render(<SvgViewer {...defaultProps} />);
      
      // Zoom in first
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      
      // Reset
      const resetButton = screen.getByTitle('Reset View');
      fireEvent.click(resetButton);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should disable zoom buttons at limits', () => {
      render(<SvgViewer {...defaultProps} />);
      
      // Zoom out to minimum
      const zoomOutButton = screen.getByTitle('Zoom Out');
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomOutButton);
      }
      
      expect(zoomOutButton).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should handle optimization errors gracefully', async () => {
      const { optimizeWithSvgo } = require('../utils/optimizer');
      optimizeWithSvgo.mockRejectedValue(new Error('Optimization failed'));
      
      render(<SvgViewer {...defaultProps} />);
      
      const optimizeButton = screen.getByTitle('Optimize with SVGO (Advanced)');
      fireEvent.click(optimizeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Optimization failed/)).toBeInTheDocument();
      });
    });

    it('should handle clipboard errors gracefully', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<SvgViewer {...defaultProps} />);
      
      const copyButton = screen.getByTitle('Copy SVG Code');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[SvgViewer] Failed to copy to clipboard:',
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and titles', () => {
      render(<SvgViewer {...defaultProps} />);
      
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Reset View')).toBeInTheDocument();
      expect(screen.getByTitle('Hide Inspector')).toBeInTheDocument();
      expect(screen.getByTitle('Copy SVG Code')).toBeInTheDocument();
      expect(screen.getByTitle('Export as .svg')).toBeInTheDocument();
    });

    it('should handle keyboard navigation', () => {
      render(<SvgViewer {...defaultProps} />);
      
      const optimizeButton = screen.getByTitle('Optimize with SVGO (Advanced)');
      optimizeButton.focus();
      
      expect(optimizeButton).toHaveFocus();
    });
  });
});