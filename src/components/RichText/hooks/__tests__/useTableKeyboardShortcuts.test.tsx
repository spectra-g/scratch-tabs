import { renderHook } from '@testing-library/react';
import { useTableKeyboardShortcuts } from '../useTableKeyboardShortcuts';

// Mock the utilities
jest.mock('../../components/utils/tableContextMenuUtils', () => ({
  detectOS: jest.fn().mockReturnValue('mac'),
  isInTableHeader: jest.fn().mockReturnValue(false),
}));

describe('useTableKeyboardShortcuts', () => {
  const createMockEditor = () => {
    const runMock = jest.fn();
    const addRowBeforeMock = jest.fn(() => ({ run: runMock }));
    const addRowAfterMock = jest.fn(() => ({ run: runMock }));
    const addColumnBeforeMock = jest.fn(() => ({ run: runMock }));
    const addColumnAfterMock = jest.fn(() => ({ run: runMock }));
    const focusMock = jest.fn(() => ({
      addRowBefore: addRowBeforeMock,
      addRowAfter: addRowAfterMock,
      addColumnBefore: addColumnBeforeMock,
      addColumnAfter: addColumnAfterMock,
    }));
    const chainMock = jest.fn(() => ({
      focus: focusMock,
    }));

    return {
      isActive: jest.fn(),
      chain: chainMock,
      // Expose the mocks for testing
      _mocks: {
        run: runMock,
        addRowBefore: addRowBeforeMock,
        addRowAfter: addRowAfterMock,
        addColumnBefore: addColumnBeforeMock,
        addColumnAfter: addColumnAfterMock,
        focus: focusMock,
        chain: chainMock,
      }
    } as any;
  };

  const createKeyboardEvent = (key: string, modifiers: { ctrlKey?: boolean; altKey?: boolean } = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrlKey || false,
      altKey: modifiers.altKey || false,
      bubbles: true,
    });
    jest.spyOn(event, 'preventDefault');
    return event;
  };

  let mockEditor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a fresh mock editor for each test
    mockEditor = createMockEditor();
    mockEditor.isActive.mockReturnValue(true); // Default to being in a table
    
    // Mock DOM methods
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  it('should add event listener when editor is provided', () => {
    renderHook(() => useTableKeyboardShortcuts({ editor: mockEditor }));
    
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove event listener on cleanup', () => {
    const { unmount } = renderHook(() => useTableKeyboardShortcuts({ editor: mockEditor }));
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not add event listener when editor is null', () => {
    renderHook(() => useTableKeyboardShortcuts({ editor: null }));
    
    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  describe('keyboard event handling', () => {
    let keydownHandler: (e: KeyboardEvent) => void;

    beforeEach(() => {
      // Capture the event handler
      document.addEventListener = jest.fn((event, handler) => {
        if (event === 'keydown') {
          keydownHandler = handler as (e: KeyboardEvent) => void;
        }
      });
      
      renderHook(() => useTableKeyboardShortcuts({ editor: mockEditor }));
    });

    it('should handle ArrowDown shortcut to add row after', () => {
      const event = createKeyboardEvent('ArrowDown', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockEditor._mocks.chain).toHaveBeenCalled();
      expect(mockEditor._mocks.focus).toHaveBeenCalled();
      expect(mockEditor._mocks.addRowAfter).toHaveBeenCalled();
      expect(mockEditor._mocks.run).toHaveBeenCalled();
    });

    it('should handle ArrowUp shortcut to add row before when not in header', () => {
      const mockUtils = require('../../components/utils/tableContextMenuUtils');
      mockUtils.isInTableHeader.mockReturnValue(false);
      
      const event = createKeyboardEvent('ArrowUp', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockEditor._mocks.chain).toHaveBeenCalled();
      expect(mockEditor._mocks.focus).toHaveBeenCalled();
      expect(mockEditor._mocks.addRowBefore).toHaveBeenCalled();
      expect(mockEditor._mocks.run).toHaveBeenCalled();
    });

    it('should NOT handle ArrowUp shortcut when in header', () => {
      const mockUtils = require('../../components/utils/tableContextMenuUtils');
      mockUtils.isInTableHeader.mockReturnValue(true);
      
      const event = createKeyboardEvent('ArrowUp', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockEditor._mocks.addRowBefore).not.toHaveBeenCalled();
    });

    it('should handle ArrowLeft shortcut to add column before', () => {
      const event = createKeyboardEvent('ArrowLeft', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockEditor._mocks.chain).toHaveBeenCalled();
      expect(mockEditor._mocks.focus).toHaveBeenCalled();
      expect(mockEditor._mocks.addColumnBefore).toHaveBeenCalled();
      expect(mockEditor._mocks.run).toHaveBeenCalled();
    });

    it('should handle ArrowRight shortcut to add column after', () => {
      const event = createKeyboardEvent('ArrowRight', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockEditor._mocks.chain).toHaveBeenCalled();
      expect(mockEditor._mocks.focus).toHaveBeenCalled();
      expect(mockEditor._mocks.addColumnAfter).toHaveBeenCalled();
      expect(mockEditor._mocks.run).toHaveBeenCalled();
    });

    it('should ignore shortcuts when not in a table', () => {
      mockEditor.isActive.mockReturnValue(false);
      
      const event = createKeyboardEvent('ArrowDown', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockEditor._mocks.addRowAfter).not.toHaveBeenCalled();
    });

    it('should ignore shortcuts when modifiers are not pressed', () => {
      const event = createKeyboardEvent('ArrowDown');
      
      keydownHandler(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockEditor._mocks.addRowAfter).not.toHaveBeenCalled();
    });

    it('should ignore shortcuts when only one modifier is pressed', () => {
      const event = createKeyboardEvent('ArrowDown', { ctrlKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockEditor._mocks.addRowAfter).not.toHaveBeenCalled();
    });

    it('should ignore non-arrow keys', () => {
      const event = createKeyboardEvent('a', { ctrlKey: true, altKey: true });
      
      keydownHandler(event);
      
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});