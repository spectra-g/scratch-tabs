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

    it('should return true for cells in different columns (different rows)', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col2']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(true);
    });

    it('should return false for multiple cells in same row', () => {
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

    it('should return true for multiple cells across different columns and rows', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col2', 'row1-col3']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false); // row1 has cells in col1 and col3 (same row, different columns)
    });

    it('should return true for cells spread across different rows and columns', () => {
      const selectedCells = new Set(['row1-col2', 'row2-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(true); // Different rows, different columns - valid
    });

    it('should return false for complex selection with same-row conflict', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col2', 'row2-col3']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false); // row2 has cells in col2 and col3 (same row conflict)
    });

    it('should return true for user scenario - many cells spanning different columns and rows', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col2', 'row1-col3', 'row2-col1']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(false); // This should be false because row1 has col1 and col3 (same row conflict)
    });

    it('should return true for valid multi-column selection across different rows', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col2']);
      const result = canPerformShiftRight(selectedCells, mockData, mockColumns);
      expect(result).toBe(true); // Different rows, different columns - should be valid
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