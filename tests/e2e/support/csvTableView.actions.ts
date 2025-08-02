import { Page, expect } from '@playwright/test';

export class CsvTableViewActions {
  constructor(private page: Page) {}

  // Core CSV table view elements
  getCsvTableViewer() {
    return this.page.locator('[data-testid="csv-table-viewer"]');
  }

  getCsvTable() {
    return this.page.locator('[data-testid="csv-table"]');
  }

  getCsvTableContainer() {
    return this.page.locator('[data-testid="csv-table-container"]');
  }

  // Header and column operations
  getColumnHeader(columnName: string) {
    return this.page.locator(`[data-testid="column-header"]:has-text("${columnName}")`);
  }

  getAllColumnHeaders() {
    return this.page.locator('[data-testid="column-header"]');
  }

  async expectColumnHeadersVisible(headers: string[]) {
    for (const header of headers) {
      const headerElement = this.getColumnHeader(header);
      await expect(headerElement).toBeVisible();
    }
  }

  async clickColumnHeader(columnName: string) {
    const header = this.getColumnHeader(columnName);
    await header.click();
  }

  async getColumnCount() {
    const headers = this.getAllColumnHeaders();
    return await headers.count();
  }

  // Row operations
  getCsvRow(rowIndex: number) {
    return this.page.locator(`[data-testid="csv-row"]:nth-child(${rowIndex})`);
  }

  getAllCsvRows() {
    return this.page.locator('[data-testid="csv-row"]');
  }

  async getRowCount() {
    const rows = this.getAllCsvRows();
    return await rows.count();
  }

  async expectRowCount(expectedCount: number) {
    const actualCount = await this.getRowCount();
    expect(actualCount).toBe(expectedCount);
  }

  // Cell operations
  getCsvCell(rowIndex: number, columnIndex: number) {
    return this.page.locator(`[data-testid="csv-cell"][data-row="${rowIndex}"][data-col="${columnIndex}"]`);
  }

  getCsvCellByContent(content: string) {
    return this.page.locator(`[data-testid="csv-cell"]:has-text("${content}")`);
  }

  async clickCell(rowIndex: number, columnIndex: number) {
    const cell = this.getCsvCell(rowIndex, columnIndex);
    await cell.click();
  }

  async clickEdit(rowIndex: number, columnIndex: number) {
    const cell = this.getEditCell();
    await cell.click();
  }

  async editCell(rowIndex: number, columnIndex: number, newValue: string) {
    await this.clickCell(rowIndex, columnIndex);
    await this.clickEdit(rowIndex, columnIndex);
    await this.getCsvCell(rowIndex, columnIndex).filter({ has: this.page.locator('input') }).waitFor();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(newValue);
    await this.page.keyboard.press('Enter');
    await this.page.waitForSelector(
      `[data-testid="csv-cell"][data-row="${rowIndex}"][data-col="${columnIndex}"] input`,
      { state: 'detached' }
    );
    await this.page.waitForTimeout(300);
  }

  // Toolbar operations
  getEditCell() {
    return this.page.locator('[title="Edit cell"]', { hasText: undefined }).filter({ has: null }).first();
  }

  getUndoButton() {
    return this.page.locator('[title="Undo"]');
  }

  getRedoButton() {
    return this.page.locator('[title="Redo"]');
  }

  getAddRowButton() {
    return this.page.locator('[title="Add row"]');
  }

  getAddColumnButton() {
    return this.page.locator('[title="Add column after"]');
  }

  getDeleteRowButton() {
    return this.page.locator('[title="Delete row"]');
  }

  getDeleteColumnButton() {
    return this.page.locator('[title="Delete column"]');
  }

  getFindDuplicatesButton() {
    return this.page.locator('[title="Find duplicate rows"]');
  }

  getRemoveDuplicatesButton() {
    return this.page.locator('[title="Remove duplicate rows (keep first occurrence)"]');
  }

  getCreateSnapshotButton() {
    return this.page.locator('[title="Create snapshot"]');
  }

  getExportDropdown() {
    return this.page.locator('[title="Export data"]');
  }

  async clickUndo() {
    const undoButton = this.getUndoButton();
    await undoButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickRedo() {
    const redoButton = this.getRedoButton();
    await redoButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickAddRow() {
    const addRowButton = this.getAddRowButton();
    await addRowButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickAddColumn() {
    const addColumnButton = this.getAddColumnButton();
    await addColumnButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickFindDuplicates() {
    const findDuplicatesButton = this.getFindDuplicatesButton();
    await findDuplicatesButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickRemoveDuplicates() {
    const removeDuplicatesButton = this.getRemoveDuplicatesButton();
    await removeDuplicatesButton.click();
    await this.page.waitForTimeout(500);
  }

  async clickCreateSnapshot() {
    const createSnapshotButton = this.getCreateSnapshotButton();
    await createSnapshotButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickExportDropdown() {
    const exportDropdown = this.getExportDropdown();
    await exportDropdown.click();
    await this.page.waitForTimeout(300);
  }

  // Export operations
  getExportOption(format: string) {
    return this.page.locator(`[data-testid="export-option"][data-format="${format}"]`);
  }

  async expectExportOptionsVisible(formats: string[]) {
    for (const format of formats) {
      const option = this.getExportOption(format);
      await expect(option).toBeVisible();
    }
  }

  async clickExportOption(format: string) {
    const option = this.getExportOption(format);
    await option.click();
    await this.page.waitForTimeout(300);
  }

  // Status and statistics
  getRowColumnStatus() {
    return this.page.locator('[data-testid="row-column-status"]');
  }

  async expectRowColumnStatus(expectedText: string) {
    const statusElement = this.getRowColumnStatus();
    await expect(statusElement).toHaveText(expectedText);
  }

  // Duplicate detection
  getDuplicateRowIndicator() {
    return this.page.locator('[data-testid="duplicate-row-indicator"]');
  }

  getDuplicateMessage() {
    return this.page.locator('[data-testid="duplicate-message"]');
  }

  async expectDuplicatesFound() {
    const duplicateIndicator = this.getDuplicateRowIndicator();
    await expect(duplicateIndicator).toBeVisible();
  }

  async expectNoDuplicatesFound() {
    const noDuplicatesMessage = this.page.locator('text=No duplicates found');
    await expect(noDuplicatesMessage).toBeVisible();
  }

  // Validation and error handling
  getValidationWarning() {
    return this.page.locator('[data-testid="validation-warning"]');
  }

  getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]');
  }

  async expectValidationWarningVisible() {
    const validationWarning = this.getValidationWarning();
    await expect(validationWarning).toBeVisible();
  }

  async expectNoErrorMessages() {
    const errorMessage = this.getErrorMessage();
    await expect(errorMessage).not.toBeVisible();
  }

  // Virtualization and performance
  getVirtualizedTable() {
    return this.page.locator('[data-testid="virtualized-table"]');
  }

  async expectVirtualizedTableVisible() {
    const virtualizedTable = this.getVirtualizedTable();
    await expect(virtualizedTable).toBeVisible();
  }

  async scrollTable(deltaY: number) {
    const tableContainer = this.getCsvTableContainer();
    await tableContainer.hover();
    await this.page.mouse.wheel(0, deltaY);
    await this.page.waitForTimeout(100);
  }

  async expectSmoothScrolling() {
    // Test scrolling performance
    await this.scrollTable(500);
    const tableContainer = this.getCsvTableContainer();
    await expect(tableContainer).toBeVisible();
    
    await this.scrollTable(-500);
    await expect(tableContainer).toBeVisible();
  }

  // Column sorting
  getSortButton(columnName: string) {
    const header = this.getColumnHeader(columnName);
    return header.locator('[data-testid="sort-column"]');
  }

  async clickSort(columnName: string) {
    const sortButton = this.getSortButton(columnName);
    await sortButton.click();
    await this.page.waitForTimeout(300);
  }

  async expectSortingOptionsVisible() {
    const sortButton = this.page.locator('[data-testid="sort-column"]');
    await expect(sortButton).toBeVisible();
  }

  // Data integrity
  async expectQuotedValuesPreserved() {
    const quotedValue = this.page.locator('text=HP laptop with "quotes"');
    await expect(quotedValue).toBeVisible();
  }

  async expectSpecialCharactersHandled() {
    const specialChars = this.page.locator('text="$999.99"');
    await expect(specialChars).toBeVisible();
  }

  // General expectations
  async expectCsvTableViewVisible() {
    const csvTableViewer = this.getCsvTableViewer();
    await expect(csvTableViewer).toBeVisible();
  }

  async expectCsvTableViewNotVisible() {
    const csvTableViewer = this.getCsvTableViewer();
    await expect(csvTableViewer).not.toBeVisible();
  }

  async expectTableStructureValid() {
    const csvTable = this.getCsvTable();
    await expect(csvTable).toBeVisible();
    
    // Verify basic table structure
    const headers = this.getAllColumnHeaders();
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
    
    const rows = this.getAllCsvRows();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  }

  // Wait for operations
  async waitForTableToLoad() {
    const csvTableViewer = this.getCsvTableViewer();
    await expect(csvTableViewer).toBeVisible();
    await this.page.waitForTimeout(500);
  }

  async waitForDataChange() {
    await this.page.waitForTimeout(300);
  }

  async waitForExportComplete() {
    await this.page.waitForTimeout(1000);
  }

  // Helper methods for common operations
  async addNewRow() {
    await this.clickAddRow();
    await this.waitForDataChange();
  }

  async addNewColumn() {
    await this.clickAddColumn();
    await this.waitForDataChange();
  }

  async performUndo() {
    await this.clickUndo();
    await this.waitForDataChange();
  }

  async performRedo() {
    await this.clickRedo();
    await this.waitForDataChange();
  }

  async makeDataChange() {
    // Generic method to make some change to the data
    // This could be editing a cell, adding a row, etc.
    const firstCell = this.getCsvCell(0, 0);
    if (await firstCell.isVisible()) {
      await this.editCell(0, 0, 'Modified Data');
    } else {
      await this.addNewRow();
    }
  }

  // Context menu operations
  async rightClickCell(rowIndex: number, columnIndex: number) {
    const cell = this.getCsvCell(rowIndex, columnIndex);
    await cell.click({ button: 'right' });
    await this.page.waitForTimeout(200);
  }

  async rightClickColumnHeader(columnName: string) {
    const header = this.getColumnHeader(columnName);
    await header.click({ button: 'right' });
    await this.page.waitForTimeout(200);
  }

  // Keyboard operations
  async navigateWithArrowKeys(direction: 'up' | 'down' | 'left' | 'right') {
    await this.page.keyboard.press(`Arrow${direction.charAt(0).toUpperCase() + direction.slice(1)}`);
    await this.page.waitForTimeout(100);
  }

  async selectAllCells() {
    await this.page.keyboard.press('Control+a');
    await this.page.waitForTimeout(200);
  }

  async copySelection() {
    await this.page.keyboard.press('Control+C');
    await this.page.waitForTimeout(200);
  }

  async pasteSelection() {
    await this.page.keyboard.press('Control+V');
    await this.page.waitForTimeout(200);
  }
}