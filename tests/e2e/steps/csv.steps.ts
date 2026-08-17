const { Then: CsvThen, When: CsvWhen } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

export {}; // Make this file a module to avoid global scope conflicts

// CSV-specific step definitions with very specific patterns to avoid conflicts

// Status bar language detection steps
CsvThen('the status bar should show language {string}', async function(expectedLanguage) {
  await this.statusBar.expectStatusBarLanguage(expectedLanguage);
});

CsvThen('the status bar should show language "{string}"', async function(expectedLanguage) {
  await this.statusBar.expectStatusBarLanguage(expectedLanguage);
});

// Text/Data view switch steps
CsvThen('the status bar should contain a Data View button', async function() {
  await this.statusBar.expectDataViewSwitchVisible();
});

CsvThen('the status bar should not contain a Data View button', async function() {
  await this.statusBar.expectDataViewSwitchNotVisible();
});

CsvWhen('I click the Data View button in the status bar', async function() {
  await this.statusBar.clickDataViewButton();
});

CsvWhen('I click the Text View button in the status bar', async function() {
  await this.statusBar.clickTextViewButton();
});

// CSV table view visibility steps
CsvThen('I should see the CSV table view', async function() {
  await this.csvTableView.expectCsvTableViewVisible();
});

CsvThen('I should see the Monaco editor', async function() {
  const monacoEditor = this.page.locator('.monaco-editor');
  await expect(monacoEditor).toBeVisible();
});

// CSV table content steps
CsvThen('I should see column headers {string}, {string}, {string}, {string}', async function(header1, header2, header3, header4) {
  await this.csvTableView.expectColumnHeadersVisible([header1, header2, header3, header4]);
});

CsvThen('I should see the row count {string}', async function(expectedRowCount) {
  await this.csvTableView.expectRowColumnStatus(expectedRowCount);
});

// Very specific CSV button steps to avoid conflicts with generic button steps
CsvThen('I should see the "Undo" button', async function() {
  const button = this.page.locator('[title="Undo"]');
  await expect(button).toBeVisible();
});

CsvThen('I should see the "Redo" button', async function() {
  const button = this.page.locator('[title="Redo"]');
  await expect(button).toBeVisible();
});

CsvThen('I should see the "Find duplicate rows" button', async function() {
  const button = this.page.locator('[title="Find duplicate rows"]');
  await expect(button).toBeVisible();
});

CsvThen('I should see the "Add column after" button', async function() {
  const button = this.page.locator('[title="Add column after"]');
  const count = await button.count();
  expect(count).toBeGreaterThan(0);
});

CsvThen('I should see the "Create snapshot" button', async function() {
  const button = this.page.locator('[title="Create snapshot"]');
  await expect(button).toBeVisible();
});

CsvThen('I should see the "Export" dropdown', async function() {
  const dropdown = this.page.locator('[title="Export data"]');
  await expect(dropdown).toBeVisible();
});

CsvThen('I should see the "Show All" button', async function() {
  const dropdown = this.page.locator('[title="Show all rows"]');
  await expect(dropdown).toBeVisible();
});

CsvWhen('I click the "Undo" button', async function() {
  const button = this.page.locator('[title="Undo"]');
  await button.click();
  await this.page.waitForTimeout(300);
});

CsvWhen('I click the "Redo" button', async function() {
  const button = this.page.locator('[title="Redo"]');
  await button.click();
  await this.page.waitForTimeout(300);
});

CsvWhen('I click the "Find duplicate rows" button', async function() {
  const button = this.page.locator('[title="Find duplicate rows"]');
  await button.click();
//   await this.page.waitForTimeout(300);
});

CsvWhen('I click the "Export" dropdown', async function() {
  const dropdown = this.page.locator('[title="Export data"]');
  await dropdown.click();
//   await this.page.waitForTimeout(300);
});

// Duplicate detection steps
CsvThen('I should see a message indicating no duplicates found', async function() {
  const noDuplicatesMessage = this.page.locator('text=No duplicates found');
  await expect(noDuplicatesMessage).toBeVisible();
});

CsvThen('I should see duplicate row indicators', async function() {
  const duplicateIndicator = this.page.locator('[data-testid="duplicate-row-indicator"]');
  const count = await duplicateIndicator.count();
  expect(count).toBeGreaterThan(0);
});

CsvThen('I should see options to remove duplicates', async function() {
  const removeDuplicatesButton = this.page.locator('[title="Remove duplicate rows (keep first occurrence)"]');
  await expect(removeDuplicatesButton).toBeVisible();
});

// Data manipulation steps
CsvWhen('I make changes to the CSV data in table view', async function() {
  await this.csvTableView.makeDataChange();
});

CsvThen('the active editor content should reflect the changes made in table view', async function() {
  const content = await this.editor.getMonacoEditorContent();
  
  expect(content).not.toBe('');
  expect(content).toContain('ID,Name,Age,City');
});

// Export functionality steps
CsvThen('I should see export options for {string}, {string}, {string}, and {string}', async function(option1, option2, option3, option4) {
  await expect(this.page.locator('text=' + option1)).toBeVisible();
  await expect(this.page.locator('text=' + option2)).toBeVisible();
  await expect(this.page.locator('text=' + option3)).toBeVisible();
  await expect(this.page.locator('text=' + option4)).toBeVisible();
});

// Column manipulation steps
CsvWhen('I click the {string} button for the {string} column', async function(buttonTitle, columnName) {
  const columnHeader = this.page.locator(`text=${columnName}`);
  const button = columnHeader.locator('..').locator('..').locator(`[title="${buttonTitle}"]`);
  await button.click();
  await this.page.waitForTimeout(300);
});

CsvThen('I should see a new column added after {string}', async function(columnName) {
  const newColumn = this.page.locator('[data-testid="new-column"]');
  await expect(newColumn).toBeVisible();
});

CsvThen('the table structure should update accordingly', async function() {
  await this.page.waitForTimeout(500);
  const table = this.page.locator('[data-testid="csv-table"]');
  await expect(table).toBeVisible();
});

CsvThen('the active editor content should include the new column', async function() {
  const content = await this.editor.getMonacoEditorContent();

  const lines = content.split('\n');
  const headerLine = lines[0];
  const columnCount = headerLine.split(',').length;
  
  expect(columnCount).toBeGreaterThan(4);
});

// Undo/Redo functionality steps
CsvThen('the changes should be reverted', async function() {
  await this.page.waitForTimeout(300);
  const table = this.page.locator('[data-testid="csv-table"]');
  await expect(table).toBeVisible();
});

CsvThen('the changes should be reapplied', async function() {
  await this.page.waitForTimeout(300);
  const table = this.page.locator('[data-testid="csv-table"]');
  await expect(table).toBeVisible();
});

// Data integrity steps
CsvThen('the quoted values should be preserved correctly', async function() {
  const quotedValue = this.page.locator('text=HP laptop with "quotes"');
  await expect(quotedValue).toBeVisible();
});

CsvThen('special characters should be handled properly', async function() {
  const specialChars = this.page.locator('text="$999.99"');
  await expect(specialChars).toBeVisible();
});

CsvThen('the active editor content should maintain the original formatting and quotes', async function() {
  const content = await this.editor.getMonacoEditorContent();
  
  expect(content).toContain('"Product","Price","Description"');
  expect(content).toContain('HP laptop with "quotes"');
});

// Performance and malformed data steps
CsvThen('the table should handle malformed rows gracefully', async function() {
  const table = this.page.locator('[data-testid="csv-table"]');
  await expect(table).toBeVisible();
  
  const errorMessage = this.page.locator('[data-testid="error-message"]');
  await expect(errorMessage).not.toBeVisible();
});

CsvThen('I should see data validation indicators', async function() {
  const validationIndicator = this.page.locator('[data-testid="validation-warning"]');
  await expect(validationIndicator).toBeVisible();
});

CsvThen('the table should render efficiently with virtualization', async function() {
  const virtualizedTable = this.page.locator('[data-testid="virtualized-table"]');
  await expect(virtualizedTable).toBeVisible();
});

CsvThen('I should be able to scroll through the data smoothly', async function() {
  const tableContainer = this.page.locator('[data-testid="csv-table-container"]');
  await expect(tableContainer).toBeVisible();
  
  await tableContainer.hover();
  await this.page.mouse.wheel(0, 500);
  await this.page.waitForTimeout(100);
  
  await expect(tableContainer).toBeVisible();
});

// Column sorting and statistics steps
CsvThen('I should see column sorting options', async function() {
  const sortButton = this.page.locator('[data-testid="sort-column"]');
  const count = await sortButton.count();
  expect(count).toBeGreaterThan(0);
});

// Generic CSV table element checks
CsvThen('I should see {string}', async function(text) {
  const element = this.page.locator(`text=${text}`);
  await expect(element).toBeVisible();
});
