/**
 * Utility functions for CSV table cell operations
 */

/**
 * Creates a unique key for a cell based on its row and column IDs
 * @param rowId - The row identifier
 * @param columnId - The column identifier
 * @returns A unique cell key string
 */
export const createCellKey = (rowId: string, columnId: string): string => {
  return `${rowId}-${columnId}`;
};

/**
 * Parses a cell key back into row and column IDs
 * @param cellKey - The cell key to parse
 * @returns Object containing rowId and columnId
 */
export const parseCellKey = (cellKey: string): { rowId: string; columnId: string } => {
  const [rowId, ...columnParts] = cellKey.split('-');
  const columnId = columnParts.join('-');
  return { rowId, columnId };
};

/**
 * Checks if a multi-selection operation is valid (all cells in same column)
 * @param cellKeys - Array of cell keys to validate
 * @returns True if all cells are in the same column
 */
export const isValidMultiSelection = (cellKeys: string[]): boolean => {
  if (cellKeys.length <= 1) return true;
  
  const columnIds = cellKeys.map(key => parseCellKey(key).columnId);
  const uniqueColumns = new Set(columnIds);
  return uniqueColumns.size === 1;
};