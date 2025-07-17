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
 * Updates the cursor position test indicator
 */
export function updateCursorIndicator(): void {
  updateTestIndicator('test-cursor-indicator', 'data-last-cursor-save');
}