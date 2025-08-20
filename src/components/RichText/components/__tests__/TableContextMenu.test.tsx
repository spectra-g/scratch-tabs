import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableContextMenu } from '../TableContextMenu';

// Mock the hooks and utilities
jest.mock('../hooks/useTableMenuItems', () => ({
  useTableMenuItems: jest.fn().mockReturnValue([
    {
      id: 'addRowBelow',
      label: 'Add row below',
      action: jest.fn(),
    },
    {
      id: 'separator1',
      isSeparator: true,
    },
    {
      id: 'deleteTable',
      label: 'Delete table',
      action: jest.fn(),
    },
  ]),
}));

jest.mock('../hooks/useVisibleMenuItems', () => ({
  useVisibleMenuItems: jest.fn().mockImplementation((items) => items),
}));

jest.mock('../../../../hooks/useClickOutside', () => ({
  useClickOutside: jest.fn(),
}));

jest.mock('../../../Tab/ContextMenuItem', () => ({
  ContextMenuItem: ({ item }: any) => (
    <button onClick={item.action} data-testid={`menu-item-${item.id}`}>
      {typeof item.label === 'string' ? item.label : 'Menu Item'}
    </button>
  ),
}));

describe('TableContextMenu', () => {
  const mockEditor = {
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        addRowAfter: jest.fn(() => ({ run: jest.fn() })),
        deleteTable: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
  } as any;

  const mockProps = {
    editor: mockEditor,
    position: { x: 100, y: 200 },
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render at the correct position', () => {
    render(<TableContextMenu {...mockProps} />);
    
    const menu = screen.getByTestId('table-context-menu');
    expect(menu).toHaveStyle({
      top: '200px',
      left: '100px',
    });
  });

  it('should render menu items', () => {
    render(<TableContextMenu {...mockProps} />);
    
    expect(screen.getByTestId('menu-item-addRowBelow')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-deleteTable')).toBeInTheDocument();
  });

  it('should render separators', () => {
    render(<TableContextMenu {...mockProps} />);
    
    const separators = screen.getAllByRole('generic');
    const separator = separators.find(el => 
      el.className.includes('border-t')
    );
    expect(separator).toBeInTheDocument();
  });

  it('should prevent context menu on the menu itself', () => {
    render(<TableContextMenu {...mockProps} />);
    
    const menu = screen.getByTestId('table-context-menu');
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(contextMenuEvent, 'preventDefault');
    
    fireEvent(menu, contextMenuEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should call useTableMenuItems with correct parameters', () => {
    const useTableMenuItems = require('../hooks/useTableMenuItems').useTableMenuItems;
    
    render(<TableContextMenu {...mockProps} />);
    
    expect(useTableMenuItems).toHaveBeenCalledWith({
      editor: mockEditor,
      onAction: expect.any(Function),
    });
  });

  it('should call useVisibleMenuItems with menu items', () => {
    const useVisibleMenuItems = require('../hooks/useVisibleMenuItems').useVisibleMenuItems;
    
    render(<TableContextMenu {...mockProps} />);
    
    expect(useVisibleMenuItems).toHaveBeenCalledWith([
      {
        id: 'addRowBelow',
        label: 'Add row below',
        action: expect.any(Function),
      },
      {
        id: 'separator1',
        isSeparator: true,
      },
      {
        id: 'deleteTable',
        label: 'Delete table',
        action: expect.any(Function),
      },
    ]);
  });

  it('should call action when menu item is clicked', () => {
    const useTableMenuItems = require('../hooks/useTableMenuItems').useTableMenuItems;
    const mockActionFn = jest.fn();
    
    useTableMenuItems.mockReturnValue([
      {
        id: 'addRowBelow',
        label: 'Add row below',
        action: mockActionFn,
      }
    ]);
    
    render(<TableContextMenu {...mockProps} />);
    
    const menuItem = screen.getByTestId('menu-item-addRowBelow');
    fireEvent.click(menuItem);
    
    expect(mockActionFn).toHaveBeenCalled();
  });
});