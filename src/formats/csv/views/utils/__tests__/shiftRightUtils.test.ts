import { canPerformShiftRight, getShiftRightCellIdentifiers } from '../shiftRightUtils';
import { CsvRow, CsvColumn } from '../../types';

describe('shiftRightUtils', () => {
  const mockColumns: CsvColumn[] = [
    { id: 'col1', name: 'Name', type: 'text', index: 0 },
    { id: 'col2', name: 'Age', type: 'number', index: 1 },
    { id: 'col3', name: 'City', type: 'text', index: 2 },
    { id: 'col4', name: 'Country', type: 'text', index: 3 },
  ];

  const mockData: CsvRow[] = [
    {
      id: 'row1',
      originalIndex: 0,
      isValid: true,
      cells: [
        { value: 'John', isValid: true },
        { value: '28', isValid: true },
        { value: 'NYC', isValid: true },
        // Missing Country column
      ],
    },
    {
      id: 'row2',
      originalIndex: 1,
      isValid: true,
      cells: [
        { value: 'Jane', isValid: true },
        { value: '32', isValid: true },
        // Missing City and Country columns
      ],
    },
    {
      id: 'row3',
      originalIndex: 2,
      isValid: true,
      cells: [
        { value: 'Bob', isValid: true },
        { value: '45', isValid: true },
        { value: 'Chicago', isValid: true },
        { value: 'USA', isValid: true },
      ],
    },
  ];

  describe('canPerformShiftRight', () => {
    it('should return false for empty selection', () => {
      const result = canPerformShiftRight(new Set(), mockData, mockColumns);
      expect(result).toBe(false);
    });

    it('should return true for single cell in row with fewer columns', () => {
      const selectedCells = new Set(['row1-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(true);
    });

    it('should return false for cell in row with maximum columns', () => {
      const selectedCells = new Set(['row3-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false);
    });

    it('should return true for multiple cells in same column with fewer columns', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(true);
    });

    it('should return false for cells in different columns', () => {
      const selectedCells = new Set(['row1-col1', 'row1-col2']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false);
    });

    it('should return false if any selected row has maximum columns', () => {
      const selectedCells = new Set(['row1-col1', 'row3-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false);
    });

    it('should handle non-existent row gracefully', () => {
      const selectedCells = new Set(['nonexistent-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false);
    });
  });

  describe('getShiftRightCellIdentifiers', () => {
    it('should convert cell keys to identifiers', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col1']);
      const result = getShiftRightCellIdentifiers(selectedCells);
      
      expect(result).toEqual([
        { rowId: 'row1', columnId: 'col1' },
        { rowId: 'row2', columnId: 'col1' },
      ]);
    });

    it('should handle empty selection', () => {
      const result = getShiftRightCellIdentifiers(new Set());
      expect(result).toEqual([]);
    });

    it('should handle single cell selection', () => {
      const selectedCells = new Set(['row1-col1']);
      const result = getShiftRightCellIdentifiers(selectedCells);
      
      expect(result).toEqual([
        { rowId: 'row1', columnId: 'col1' },
      ]);
    });
  });
});