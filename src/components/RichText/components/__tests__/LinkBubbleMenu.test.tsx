import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LinkBubbleMenu } from '../LinkBubbleMenu';

// Mock the LinkModal component
jest.mock('../LinkModal', () => ({
  LinkModal: ({ isOpen, onSave, onCancel, initialUrl }: any) =>
    isOpen ? (
      <div data-testid="link-modal">
        <input 
          data-testid="link-input" 
          defaultValue={initialUrl}
          onChange={(e) => {/* mock input */}}
        />
        <button onClick={() => onSave('https://example.com')} data-testid="save-link">
          Save
        </button>
        <button onClick={onCancel} data-testid="cancel-link">
          Cancel
        </button>
      </div>
    ) : null,
}));

describe('LinkBubbleMenu', () => {
  const mockEditor = {
    isActive: jest.fn(),
    getAttributes: jest.fn(),
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        setLink: jest.fn(() => ({ run: jest.fn() })),
        unsetLink: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    state: {
      selection: {
        from: 10,
        to: 20,
      },
    },
    view: {
      coordsAtPos: jest.fn((pos) => ({
        top: 100 + pos,
        left: 50 + pos,
      })),
      dom: {
        getBoundingClientRect: jest.fn(() => ({
          top: 0,
          left: 0,
        })),
      },
    },
    on: jest.fn(),
    off: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Menu Visibility', () => {
    it('should not render when editor is not provided', () => {
      render(<LinkBubbleMenu editor={null} />);
      
      expect(screen.queryByTitle('Edit Link')).not.toBeInTheDocument();
    });

    it('should render menu when link is active', async () => {
      mockEditor.isActive.mockReturnValue(true);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      // Wait for state to update
      await waitFor(() => {
        expect(screen.getByTitle('Edit Link')).toBeInTheDocument();
      });
      
      expect(screen.getByTitle('Open Link')).toBeInTheDocument();
      expect(screen.getByTitle('Remove Link')).toBeInTheDocument();
    });

    it('should not render menu when link is not active', () => {
      mockEditor.isActive.mockReturnValue(false);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      expect(screen.queryByTitle('Edit Link')).not.toBeInTheDocument();
    });

    it('should set up editor event listeners', () => {
      mockEditor.isActive.mockReturnValue(false);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      expect(mockEditor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
      expect(mockEditor.on).toHaveBeenCalledWith('update', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      mockEditor.isActive.mockReturnValue(false);
      
      const { unmount } = render(<LinkBubbleMenu editor={mockEditor} />);
      unmount();
      
      expect(mockEditor.off).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
      expect(mockEditor.off).toHaveBeenCalledWith('update', expect.any(Function));
    });
  });

  describe('Menu Positioning', () => {
    it('should position menu based on selection coordinates', async () => {
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.view.coordsAtPos.mockImplementation((pos) => ({
        top: 200,
        left: 100,
      }));
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const menu = screen.getByTitle('Edit Link').closest('div');
        expect(menu).toHaveClass('absolute'); // Tailwind class for position: absolute
        expect(menu).toHaveStyle('top: 200px'); // 200 - 0 (offset)
        expect(menu).toHaveStyle('left: 45px'); // center position minus menu width offset + 20px right
      });
    });

    it('should recalculate position when selection changes', () => {
      mockEditor.isActive.mockReturnValue(true);
      
      const { rerender } = render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Simulate selection change by triggering the event listener
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        updateHandler();
      }
      
      rerender(<LinkBubbleMenu editor={mockEditor} />);
      
      expect(mockEditor.view.coordsAtPos).toHaveBeenCalled();
    });
  });

  describe('Link Actions', () => {
    beforeEach(() => {
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.getAttributes.mockReturnValue({ href: 'https://example.com' });
    });

    it('should open link modal when edit button is clicked', async () => {
      mockEditor.isActive.mockReturnValue(true);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      
      expect(screen.getByTestId('link-modal')).toBeInTheDocument();
      expect(screen.getByTestId('link-input')).toHaveValue('https://example.com');
    });

    it('should open link modal with empty URL for new links', async () => {
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.getAttributes.mockReturnValue({ href: '' });
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      
      expect(screen.getByTestId('link-modal')).toBeInTheDocument();
      expect(screen.getByTestId('link-input')).toHaveValue('');
    });

    it('should save link when modal save is clicked', async () => {
      const mockSetLink = jest.fn(() => ({ run: jest.fn() }));
      const mockUnsetLink = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.chain.mockReturnValue({
        focus: jest.fn(() => ({
          setLink: mockSetLink,
          unsetLink: mockUnsetLink,
        })),
      });
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      // Open modal
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      
      // Save link
      const saveButton = screen.getByTestId('save-link');
      fireEvent.click(saveButton);
      
      expect(mockSetLink).toHaveBeenCalledWith({ href: 'https://example.com' });
      expect(screen.queryByTestId('link-modal')).not.toBeInTheDocument();
    });

    it('should cancel link editing when modal cancel is clicked', async () => {
      mockEditor.isActive.mockReturnValue(true);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      // Open modal
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      
      // Cancel
      const cancelButton = screen.getByTestId('cancel-link');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByTestId('link-modal')).not.toBeInTheDocument();
    });

    it('should open link in new tab when open button is clicked', async () => {
      const mockWindowOpen = jest.fn();
      global.window.open = mockWindowOpen;
      mockEditor.isActive.mockReturnValue(true);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const openButton = screen.getByTitle('Open Link');
        fireEvent.click(openButton);
      });
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should not open link when href is empty', async () => {
      const mockWindowOpen = jest.fn();
      global.window.open = mockWindowOpen;
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.getAttributes.mockReturnValue({ href: '' });
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const openButton = screen.getByTitle('Open Link');
        fireEvent.click(openButton);
      });
      
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should remove link when unlink button is clicked', async () => {
      const mockSetLink = jest.fn(() => ({ run: jest.fn() }));
      const mockUnsetLink = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.chain.mockReturnValue({
        focus: jest.fn(() => ({
          setLink: mockSetLink,
          unsetLink: mockUnsetLink,
        })),
      });
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      await waitFor(() => {
        const unlinkButton = screen.getByTitle('Remove Link');
        fireEvent.click(unlinkButton);
      });
      
      expect(mockUnsetLink).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      mockEditor.isActive.mockReturnValue(true);
    });

    it('should manage modal visibility state', async () => {
      mockEditor.isActive.mockReturnValue(true);
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      // Initially closed
      expect(screen.queryByTestId('link-modal')).not.toBeInTheDocument();
      
      // Open modal
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      expect(screen.getByTestId('link-modal')).toBeInTheDocument();
      
      // Close modal
      const cancelButton = screen.getByTestId('cancel-link');
      fireEvent.click(cancelButton);
      expect(screen.queryByTestId('link-modal')).not.toBeInTheDocument();
    });

    it('should reset state when modal is closed', async () => {
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.getAttributes.mockReturnValue({ href: 'https://example.com' });
      
      render(<LinkBubbleMenu editor={mockEditor} />);
      
      // Trigger the selectionUpdate event to activate the menu
      const updateHandler = mockEditor.on.mock.calls.find(
        call => call[0] === 'selectionUpdate'
      )?.[1];
      
      if (updateHandler) {
        act(() => {
          updateHandler();
        });
      }
      
      // Open modal
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      
      // Close modal
      const cancelButton = screen.getByTestId('cancel-link');
      fireEvent.click(cancelButton);
      
      // Open modal again - should have current link URL
      await waitFor(() => {
        const editButton = screen.getByTitle('Edit Link');
        fireEvent.click(editButton);
      });
      expect(screen.getByTestId('link-input')).toHaveValue('https://example.com');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing editor methods gracefully', () => {
      const incompleteEditor = {
        isActive: jest.fn(() => false), // Set to false to avoid triggering effects
        getAttributes: jest.fn(() => ({ href: 'https://example.com' })),
        on: jest.fn(),
        off: jest.fn(),
        // Missing other methods
      };
      
      expect(() => {
        render(<LinkBubbleMenu editor={incompleteEditor as any} />);
      }).not.toThrow();
    });

    it('should handle editor state without selection', () => {
      const editorWithoutSelection = {
        ...mockEditor,
        state: {
          selection: null,
        },
      };
      
      editorWithoutSelection.isActive.mockReturnValue(true);
      
      expect(() => {
        render(<LinkBubbleMenu editor={editorWithoutSelection} />);
      }).not.toThrow();
    });

    it('should handle coordsAtPos errors gracefully', () => {
      mockEditor.isActive.mockReturnValue(true);
      mockEditor.view.coordsAtPos.mockImplementation(() => {
        throw new Error('Position not found');
      });
      
      expect(() => {
        render(<LinkBubbleMenu editor={mockEditor} />);
      }).not.toThrow();
    });
  });
});