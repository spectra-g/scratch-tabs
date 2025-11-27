import { renderHook } from '@testing-library/react';
import { useTableMenuItems } from '../useTableMenuItems';

// Mock the utilities
jest.mock('../../utils/tableContextMenuUtils', () => ({
  getOSShortcutText: jest.fn((shortcut) => `OS-${shortcut}`),
  SHORTCUTS: {
    ADD_ROW_ABOVE: 'Ctrl+Option+↑',
    ADD_ROW_BELOW: 'Ctrl+Option+↓',
    ADD_COLUMN_LEFT: 'Ctrl+Option+←',
    ADD_COLUMN_RIGHT: 'Ctrl+Option+→',
  },
  getTableContextFromEditor: jest.fn().mockReturnValue({
    isInHeader: false,
    isOnlyRow: false,
  }),
}));

describe('useTableMenuItems', () => {
  const mockEditor = {
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        addRowBefore: jest.fn(() => ({ run: jest.fn() })),
        addRowAfter: jest.fn(() => ({ run: jest.fn() })),
        addColumnBefore: jest.fn(() => ({ run: jest.fn() })),
        addColumnAfter: jest.fn(() => ({ run: jest.fn() })),
        deleteRow: jest.fn(() => ({ run: jest.fn() })),
        deleteColumn: jest.fn(() => ({ run: jest.fn() })),
        deleteTable: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
  } as any;

  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return menu items with shortcuts', () => {
    const { result } = renderHook(() =>
      useTableMenuItems({ editor: mockEditor, onAction: mockOnAction })
    );

    const menuItems = result.current;

    // Should have all expected items plus separators
    expect(menuItems.length).toBe(11); // 8 actions + 3 separators

    // Check that items with shortcuts have the correct structure
    const addRowAbove = menuItems.find(item => item.id === 'addRowAbove');
    expect(addRowAbove).toBeDefined();
    expect(addRowAbove?.label).not.toBe('Add row above'); // Should be wrapped with shortcut
  });

  it('should disable "Add row above" when in header', () => {
    const mockUtils = require('../../utils/tableContextMenuUtils');
    mockUtils.getTableContextFromEditor.mockReturnValue({
      isInHeader: true,
      isOnlyRow: false,
    });

    const { result } = renderHook(() =>
      useTableMenuItems({ editor: mockEditor, onAction: mockOnAction })
    );

    const addRowAbove = result.current.find(item => item.id === 'addRowAbove');
    expect(addRowAbove?.condition).toBe(false);
  });

  it('should disable "Delete row" when in header or only row', () => {
    const mockUtils = require('../../utils/tableContextMenuUtils');
    mockUtils.getTableContextFromEditor.mockReturnValue({
      isInHeader: true,
      isOnlyRow: true,
    });

    const { result } = renderHook(() =>
      useTableMenuItems({ editor: mockEditor, onAction: mockOnAction })
    );

    const deleteRow = result.current.find(item => item.id === 'deleteRow');
    expect(deleteRow?.condition).toBe(false);
  });

  it('should call onAction when menu item action is executed', () => {
    const { result } = renderHook(() =>
      useTableMenuItems({ editor: mockEditor, onAction: mockOnAction })
    );

    const addRowBelow = result.current.find(item => item.id === 'addRowBelow');
    addRowBelow?.action?.();

    expect(mockOnAction).toHaveBeenCalled();
  });
});