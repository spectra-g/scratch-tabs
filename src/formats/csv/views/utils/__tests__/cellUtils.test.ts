import { createCellKey, parseCellKey, isValidMultiSelection } from '../cellUtils';

describe('cellUtils', () => {
  describe('createCellKey', () => {
    it('should create a cell key from row and column IDs', () => {
      expect(createCellKey('row1', 'col1')).toBe('row1-col1');
      expect(createCellKey('row_123', 'column_abc')).toBe('row_123-column_abc');
    });

    it('should handle empty strings', () => {
      expect(createCellKey('', '')).toBe('-');
      expect(createCellKey('row1', '')).toBe('row1-');
      expect(createCellKey('', 'col1')).toBe('-col1');
    });
  });

  describe('parseCellKey', () => {
    it('should parse a cell key back to row and column IDs', () => {
      expect(parseCellKey('row1-col1')).toEqual({ rowId: 'row1', columnId: 'col1' });
      expect(parseCellKey('row_123-column_abc')).toEqual({ rowId: 'row_123', columnId: 'column_abc' });
    });

    it('should handle malformed keys gracefully', () => {
      expect(parseCellKey('-')).toEqual({ rowId: '', columnId: '' });
      expect(parseCellKey('row1-')).toEqual({ rowId: 'row1', columnId: '' });
      expect(parseCellKey('-col1')).toEqual({ rowId: '', columnId: 'col1' });
    });

    it('should handle keys with multiple dashes by taking first split', () => {
      expect(parseCellKey('row-1-col-1')).toEqual({ rowId: 'row', columnId: '1-col-1' });
    });
  });

  describe('isValidMultiSelection', () => {
    it('should return true for empty selection', () => {
      expect(isValidMultiSelection([])).toBe(true);
    });

    it('should return true for single cell selection', () => {
      expect(isValidMultiSelection(['row1-col1'])).toBe(true);
    });

    it('should return true for multiple cells in same column', () => {
      expect(isValidMultiSelection(['row1-col1', 'row2-col1', 'row3-col1'])).toBe(true);
    });

    it('should return false for multiple cells in different columns', () => {
      expect(isValidMultiSelection(['row1-col1', 'row2-col2'])).toBe(false);
      expect(isValidMultiSelection(['row1-col1', 'row2-col1', 'row3-col2'])).toBe(false);
    });
  });
});