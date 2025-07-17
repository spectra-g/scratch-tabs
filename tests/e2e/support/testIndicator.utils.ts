import { expect, Locator, Page } from '@playwright/test';

/**
 * Generic function to wait for a test indicator to change
 * @param page - Playwright page object
 * @param indicatorId - ID of the test indicator element
 * @param attributeName - Name of the attribute to monitor
 */
export async function waitForTestIndicator(
  page: Page, 
  indicatorId: string, 
  attributeName: string
): Promise<void> {
  const testIndicator = page.locator(`#${indicatorId}`);
  await expect(testIndicator).toBeAttached();

  // Get the current save timestamp
  let initialValue = await testIndicator.getAttribute(attributeName);

  if (initialValue === '0') {
    // If no save has happened yet, wait for the first save
    await expect(testIndicator).not.toHaveAttribute(attributeName, initialValue);
    initialValue = await testIndicator.getAttribute(attributeName);
  }
  await expect(testIndicator).not.toHaveAttribute(attributeName, initialValue);
}

/**
 * Wait for save state to complete
 */
export async function waitForSaveIndicator(page: Page): Promise<void> {
  return waitForTestIndicator(page, 'test-save-indicator', 'data-last-save');
}

/**
 * Wait for cursor position to stabilize
 */
export async function waitForCursorIndicator(page: Page): Promise<void> {
  return waitForTestIndicator(page, 'test-cursor-indicator', 'data-last-cursor-save');
}