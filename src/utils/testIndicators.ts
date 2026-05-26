/**
 * Utility functions for updating test indicator elements used in E2E tests
 */

/**
 * Updates a test indicator element with the current timestamp
 * @param indicatorId - The ID of the test indicator element
 * @param attribute - The attribute name to update (e.g., 'data-last-save')
 */
export function updateTestIndicator(indicatorId: string, attribute: string): void {
  const indicator = document.getElementById(indicatorId);
  if (indicator) {
    indicator.setAttribute(attribute, Date.now().toString());
  }
}

/**
 * Updates the save test indicator
 */
export function updateSaveIndicator(): void {
  updateTestIndicator('test-save-indicator', 'data-last-save');
}

/**
 * Updates the cursor position test indicator.
 * Also writes data-cursor-line so E2E tests can wait for a specific line save.
 */
export function updateCursorIndicator(lineNumber?: number): void {
  const indicator = document.getElementById('test-cursor-indicator');
  if (indicator) {
    indicator.setAttribute('data-last-cursor-save', Date.now().toString());
    if (lineNumber !== undefined) {
      indicator.setAttribute('data-cursor-line', lineNumber.toString());
    }
  }
}