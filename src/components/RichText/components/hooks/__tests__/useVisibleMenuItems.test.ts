import { useVisibleMenuItems } from '../useVisibleMenuItems';
import { MenuItem } from '../../../../Tab/types';

describe('useVisibleMenuItems', () => {
  it('should filter out items with condition false', () => {
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Item 1' },
      { id: '2', label: 'Item 2', condition: false },
      { id: '3', label: 'Item 3' },
    ];

    const result = useVisibleMenuItems(menuItems);
    
    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(['1', '3']);
  });

  it('should include separators only between visible items', () => {
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Item 1' },
      { id: 'sep1', isSeparator: true },
      { id: '2', label: 'Item 2', condition: false },
      { id: 'sep2', isSeparator: true },
      { id: '3', label: 'Item 3' },
    ];

    const result = useVisibleMenuItems(menuItems);
    
    expect(result).toHaveLength(3); // Item 1, separator, and Item 3
    expect(result.map(item => item.id)).toEqual(['1', 'sep1', '3']);
  });

  it('should include separators between visible items', () => {
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Item 1' },
      { id: 'sep1', isSeparator: true },
      { id: '2', label: 'Item 2' },
      { id: 'sep2', isSeparator: true },
      { id: '3', label: 'Item 3' },
    ];

    const result = useVisibleMenuItems(menuItems);
    
    expect(result).toHaveLength(5); // All items
    expect(result.map(item => item.id)).toEqual(['1', 'sep1', '2', 'sep2', '3']);
  });

  it('should remove trailing separators', () => {
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Item 1' },
      { id: 'sep1', isSeparator: true },
      { id: '2', label: 'Item 2', condition: false },
      { id: 'sep2', isSeparator: true },
    ];

    const result = useVisibleMenuItems(menuItems);
    
    expect(result).toHaveLength(1); // Only Item 1
    expect(result.map(item => item.id)).toEqual(['1']);
  });

  it('should handle empty array', () => {
    const menuItems: MenuItem[] = [];
    const result = useVisibleMenuItems(menuItems);
    expect(result).toHaveLength(0);
  });

  it('should handle all items being filtered out', () => {
    const menuItems: MenuItem[] = [
      { id: '1', label: 'Item 1', condition: false },
      { id: '2', label: 'Item 2', condition: false },
    ];

    const result = useVisibleMenuItems(menuItems);
    expect(result).toHaveLength(0);
  });
});