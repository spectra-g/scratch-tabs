import { createCellKey, parseCellKey } from '../cellUtils';

describe('Cell Selection Logic', () => {
  describe('createCellKey', () => {
    it('should create consistent cell keys', () => {
      expect(createCellKey('row1', 'col1')).toBe('row1-col1');
      expect(createCellKey('row_2', 'col_3')).toBe('row_2-col_3');
    });
  });

  describe('parseCellKey', () => {
    it('should parse cell keys correctly', () => {
      const result = parseCellKey('row1-col1');
      expect(result.rowId).toBe('row1');
      expect(result.columnId).toBe('col1');
    });

    it('should handle complex IDs with underscores', () => {
      const result = parseCellKey('row_2-col_3');
      expect(result.rowId).toBe('row_2');
      expect(result.columnId).toBe('col_3');
    });
  });

  describe('Multi-selection toggle behavior', () => {
    it('should simulate CTRL+Click toggle logic correctly', () => {
      // Simulate the selection state
      let selectedCells = new Set<string>();
      
      const toggleCell = (cellKey: string) => {
        if (selectedCells.has(cellKey)) {
          selectedCells.delete(cellKey);
        } else {
          selectedCells.add(cellKey);
        }
      };

      // Test adding cells
      toggleCell('row1-col1');
      expect(selectedCells.has('row1-col1')).toBe(true);
      expect(selectedCells.size).toBe(1);

      toggleCell('row2-col1');
      expect(selectedCells.has('row1-col1')).toBe(true);
      expect(selectedCells.has('row2-col1')).toBe(true);
      expect(selectedCells.size).toBe(2);

      // Test removing cells
      toggleCell('row1-col1');
      expect(selectedCells.has('row1-col1')).toBe(false);
      expect(selectedCells.has('row2-col1')).toBe(true);
      expect(selectedCells.size).toBe(1);

      // Test removing last cell
      toggleCell('row2-col1');
      expect(selectedCells.size).toBe(0);
    });

    it('should handle primary selected cell management after removal', () => {
      const selectedCells = new Set(['row1-col1', 'row2-col1', 'row3-col1']);
      
      // Simulate removing a cell and selecting a remaining one
      const removedCell = 'row2-col1';
      selectedCells.delete(removedCell);
      
      const remainingCells = Array.from(selectedCells).filter(key => key !== removedCell);
      expect(remainingCells).toContain('row1-col1');
      expect(remainingCells).toContain('row3-col1');
      expect(remainingCells).not.toContain('row2-col1');
      expect(remainingCells.length).toBe(2);

      // First remaining cell should be selected as primary
      const firstRemaining = remainingCells[0];
      expect(firstRemaining).toBe('row1-col1');

      const { rowId, columnId } = parseCellKey(firstRemaining);
      expect(rowId).toBe('row1');
      expect(columnId).toBe('col1');
    });

    it('should handle clearing selection when removing last cell', () => {
      const selectedCells = new Set(['row1-col1']);
      
      // Remove the only cell
      selectedCells.delete('row1-col1');
      
      const remainingCells = Array.from(selectedCells);
      expect(remainingCells.length).toBe(0);
      
      // selectedCell should be set to null when no cells remain
      const primarySelectedCell = remainingCells.length > 0 ? remainingCells[0] : null;
      expect(primarySelectedCell).toBe(null);
    });

    it('should simulate complete CTRL+Click workflow', () => {
      let selectedCells = new Set<string>();
      let primarySelectedCell: { rowId: string; columnId: string } | null = null;

      const handleCellClick = (rowId: string, columnId: string, isCtrlClick: boolean) => {
        const cellKey = createCellKey(rowId, columnId);
        
        if (isCtrlClick) {
          const wasSelected = selectedCells.has(cellKey);
          
          if (wasSelected) {
            selectedCells.delete(cellKey);
            
            // Update primary selected cell
            const remainingCells = Array.from(selectedCells);
            if (remainingCells.length > 0) {
              const firstRemaining = remainingCells[0];
              const parsed = parseCellKey(firstRemaining);
              primarySelectedCell = { rowId: parsed.rowId, columnId: parsed.columnId };
            } else {
              primarySelectedCell = null;
            }
          } else {
            selectedCells.add(cellKey);
            primarySelectedCell = { rowId, columnId };
          }
        } else {
          // Regular click
          selectedCells = new Set([cellKey]);
          primarySelectedCell = { rowId, columnId };
        }
      };

      // Test the workflow
      handleCellClick('row1', 'col1', false); // Regular click
      expect(selectedCells.size).toBe(1);
      expect(primarySelectedCell?.rowId).toBe('row1');

      handleCellClick('row2', 'col1', true); // CTRL+Click add
      expect(selectedCells.size).toBe(2);
      expect(primarySelectedCell?.rowId).toBe('row2');

      handleCellClick('row3', 'col1', true); // CTRL+Click add
      expect(selectedCells.size).toBe(3);
      expect(primarySelectedCell?.rowId).toBe('row3');

      handleCellClick('row2', 'col1', true); // CTRL+Click remove
      expect(selectedCells.size).toBe(2);
      expect(selectedCells.has('row2-col1')).toBe(false);
      expect(primarySelectedCell?.rowId).toBe('row1'); // Should switch to first remaining

      handleCellClick('row4', 'col1', false); // Regular click clears all
      expect(selectedCells.size).toBe(1);
      expect(selectedCells.has('row4-col1')).toBe(true);
      expect(primarySelectedCell?.rowId).toBe('row4');
    });
  });
});