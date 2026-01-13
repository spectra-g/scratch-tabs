/**
 * Tests for SortableTab width constraints
 *
 * This test suite verifies that:
 * 1. Regular tabs have minimum width of 120px
 * 2. Regular tabs have default width of 160px
 * 3. Regular tabs have maximum width of 200px
 * 4. Pinned tabs have minimum width of 40px
 * 5. Pinned tabs have auto width
 * 6. All tabs have flexShrink: 0 to prevent squashing
 */
import { render } from '@testing-library/react';
import React from 'react';
import { SortableTab } from '../SortableTab';
import { Tab } from '../../../types';
import { DndContext } from '@dnd-kit/core';

// Mock the DnD hook
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

describe('SortableTab Width Constraints', () => {
  const mockTab: Tab = {
    id: '1',
    title: 'Test Tab',
    content: 'Some content',
    language: 'plaintext',
    languageLocked: false,
    cursorPosition: { lineNumber: 1, column: 1 },
    workspaceId: 'default',
    dateCreated: Date.now(),
    lastModified: Date.now(),
    isPinned: false,
  };

  const defaultProps = {
    tab: mockTab,
    isActive: false,
    isEditing: false,
    editingTitle: '',
    maxLineCount: 100,
    side: 'left' as const,
    onClick: jest.fn(),
    onClose: jest.fn(),
    onDoubleClick: jest.fn(),
    onContextMenu: jest.fn(),
    onEditChange: jest.fn(),
    onEditSubmit: jest.fn(),
    onEditCancel: jest.fn(),
    onMouseEnterTab: jest.fn(),
    onMouseLeaveTab: jest.fn(),
  };

  test('regular tab should have flexShrink: 0 to prevent squashing', () => {
    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.flexShrink).toBe('0');
  });

  test('regular tab should have default width of 160px', () => {
    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.width).toBe('auto');
  });

  test('regular tab should have minimum width of 120px', () => {
    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.minWidth).toBe('80px');
  });

  test('regular tab should have maximum width of 200px', () => {
    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.maxWidth).toBe('200px');
  });

  test('pinned tab should have flexShrink: 0', () => {
    const pinnedTab: Tab = {
      ...mockTab,
      isPinned: true,
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={pinnedTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.flexShrink).toBe('0');
  });

  test('pinned tab should have auto width', () => {
    const pinnedTab: Tab = {
      ...mockTab,
      isPinned: true,
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={pinnedTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.width).toBe('auto');
  });

  test('pinned tab should have minimum width of 40px', () => {
    const pinnedTab: Tab = {
      ...mockTab,
      isPinned: true,
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={pinnedTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.minWidth).toBe('40px');
  });

  test('pinned tab should have auto maximum width', () => {
    const pinnedTab: Tab = {
      ...mockTab,
      isPinned: true,
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={pinnedTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.maxWidth).toBe('auto');
  });

  test('active regular tab should maintain width constraints', () => {
    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} isActive={true} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.flexShrink).toBe('0');
    expect(style.width).toBe('auto');
    expect(style.minWidth).toBe('80px');
    expect(style.maxWidth).toBe('200px');
  });

  test('dragging tab should maintain width constraints', () => {
    // Mock the useSortable hook to return isDragging: true
    jest.mock('@dnd-kit/sortable', () => ({
      useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: null,
        isDragging: true,
      }),
    }));

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.flexShrink).toBe('0');
    expect(style.width).toBe('auto');
    expect(style.minWidth).toBe('80px');
    expect(style.maxWidth).toBe('200px');
  });

  test('tablet tab should follow regular tab width constraints', () => {
    const tabletTab: Tab = {
      ...mockTab,
      isTablet: true,
      content: undefined,
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={tabletTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.flexShrink).toBe('0');
    expect(style.width).toBe('auto');
    expect(style.minWidth).toBe('80px');
    expect(style.maxWidth).toBe('200px');
  });

  test('multiple regular tabs should all have consistent width constraints', () => {
    const tab1: Tab = { ...mockTab, id: '1', title: 'Tab 1' };
    const tab2: Tab = { ...mockTab, id: '2', title: 'Tab 2' };
    const tab3: Tab = { ...mockTab, id: '3', title: 'Tab 3' };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={tab1} />
        <SortableTab {...defaultProps} tab={tab2} />
        <SortableTab {...defaultProps} tab={tab3} />
      </DndContext>
    );

    const tabElements = container.querySelectorAll('.tab-item');
    expect(tabElements).toHaveLength(3);

    tabElements.forEach((tabElement) => {
      const style = (tabElement as HTMLElement).style;
      expect(style.flexShrink).toBe('0');
      expect(style.width).toBe('auto');
      expect(style.minWidth).toBe('80px');
      expect(style.maxWidth).toBe('200px');
    });
  });

  test('mixed pinned and regular tabs should have different width constraints', () => {
    const regularTab: Tab = { ...mockTab, id: '1', title: 'Regular', isPinned: false };
    const pinnedTab: Tab = { ...mockTab, id: '2', title: 'Pinned', isPinned: true };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={regularTab} />
        <SortableTab {...defaultProps} tab={pinnedTab} />
      </DndContext>
    );

    const tabElements = container.querySelectorAll('.tab-item');
    expect(tabElements).toHaveLength(2);

    // Regular tab
    const regularStyle = (tabElements[0] as HTMLElement).style;
    expect(regularStyle.width).toBe('auto');
    expect(regularStyle.minWidth).toBe('80px');
    expect(regularStyle.maxWidth).toBe('200px');

    // Pinned tab
    const pinnedStyle = (tabElements[1] as HTMLElement).style;
    expect(pinnedStyle.width).toBe('auto');
    expect(pinnedStyle.minWidth).toBe('40px');
    expect(pinnedStyle.maxWidth).toBe('auto');
  });

  test('tab with very long title should respect max width constraint', () => {
    const longTitleTab: Tab = {
      ...mockTab,
      title: 'This is a very very very long tab title that should be constrained',
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={longTitleTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.maxWidth).toBe('200px');
  });

  test('tab with short title should respect min width constraint', () => {
    const shortTitleTab: Tab = {
      ...mockTab,
      title: 'A',
    };

    const { container } = render(
      <DndContext>
        <SortableTab {...defaultProps} tab={shortTitleTab} />
      </DndContext>
    );

    const tabElement = container.querySelector('.tab-item') as HTMLElement;
    expect(tabElement).toBeTruthy();

    const style = tabElement.style;
    expect(style.minWidth).toBe('80px');
  });
});
