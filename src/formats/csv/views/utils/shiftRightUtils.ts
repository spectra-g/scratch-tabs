import { parseCellKey } from './cellUtils';
import { CsvRow, CsvColumn } from '../types';

/**
 * Validates if shift right operation can be performed on selected cells
 * @param selectedCells - Set of selected cell keys
 * @param data - CSV row data
 * @param columns - CSV column definitions
 * @returns True if shift right is valid for all selected cells
 */
export const canPerformShiftRight = (
  selectedCells: Set<string>,
  data: CsvRow[],
  columns: CsvColumn[]
): boolean => {
  if (selectedCells.size === 0) return false;
  
  // Get all selected cells and group by column
  const cellsByColumn = new Map<string, string[]>();
  selectedCells.forEach(cellKey => {
    const { rowId, columnId } = parseCellKey(cellKey);
    if (!cellsByColumn.has(columnId)) {
      cellsByColumn.set(columnId, []);
    }
    cellsByColumn.get(columnId)!.push(rowId);
  });
  
  // Check if all selected cells are in the same column
  if (cellsByColumn.size !== 1) return false;
  
  // Check if each selected row has fewer columns than the header
  const selectedRowIds = Array.from(cellsByColumn.values())[0];
  return selectedRowIds.every(rowId => {
    const row = data.find(r => r.id === rowId);
    return row && row.cells.length < columns.length;
  });
};

/**
 * Converts selected cell keys to cell identifiers for shift operation
 * @param selectedCells - Set of selected cell keys
 * @returns Array of cell identifiers with rowId and columnId
 */
export const getShiftRightCellIdentifiers = (
  selectedCells: Set<string>
): Array<{ rowId: string; columnId: string }> => {
  return Array.from(selectedCells).map(cellKey => {
    const { rowId, columnId } = parseCellKey(cellKey);
    return { rowId, columnId };
  });
};