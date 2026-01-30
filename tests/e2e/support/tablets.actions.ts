import { Page, expect } from '@playwright/test';

/**
 * TabletsActions - Encapsulates tablet-specific interactions
 *
 * Provides helpers for interacting with different tablets (Calculator, UUID, Base64, etc.)
 */
export class TabletsActions {
  constructor(private page: Page) { }

  // ============================================================================
  // Calculator Tablet
  // ============================================================================

  /**
   * Check if calculator interface is visible
   */
  async expectCalculatorInterfaceVisible() {
    // Look for calculator-specific elements (display, buttons)
    const calculatorDisplay = this.page.locator('[data-testid*="calculator"], .calculator, [class*="calculator"]').first();
    await expect(calculatorDisplay).toBeVisible();
  }

  /**
   * Click a calculator button
   * @param buttonText - The text on the button to click (e.g., "5", "+", "=")
   */
  async clickCalculatorButton(buttonText: string) {
    // Calculator buttons are typically text-based buttons
    const button = this.page.getByRole('button', { name: buttonText, exact: true });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Get the calculator display value
   */
  async getCalculatorDisplayValue(): Promise<string> {
    // The display is typically a div or input with the result
    // Try multiple selectors to find the display
    const displaySelectors = [
      '[data-testid*="display"]',
      '[class*="display"]',
      'input[readonly]',
      '.calculator-display'
    ];

    for (const selector of displaySelectors) {
      const display = this.page.locator(selector).first();
      if (await display.isVisible().catch(() => false)) {
        const value = await display.textContent() || await display.inputValue();
        return value.trim();
      }
    }

    throw new Error('Calculator display not found');
  }

  /**
   * Expect calculator display to show a specific value
   * @param expectedValue - The expected value on the display
   */
  async expectCalculatorDisplay(expectedValue: string) {
    const actualValue = await this.getCalculatorDisplayValue();
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * Check if calculator mode selector is visible
   */
  async expectCalculatorModeSelectorVisible() {
    // Look for mode buttons (Standard, Scientific, Programmer)
    const modeButton = this.page.getByRole('button', { name: /Standard|Scientific|Programmer/i }).first();
    await expect(modeButton).toBeVisible();
  }

  /**
   * Check if calculator has number buttons
   */
  async expectCalculatorNumberButtonsVisible() {
    // Check if number buttons 0-9 are visible
    const numberButtons = this.page.getByRole('button', { name: /^[0-9]$/ });
    const count = await numberButtons.count();
    expect(count).toBeGreaterThan(0);
  }

  // ============================================================================
  // UUID Generator Tablet
  // ============================================================================

  /**
   * Check if UUID generator interface is visible
   */
  async expectUuidGeneratorInterfaceVisible() {
    // Look for UUID-specific heading or generate button
    const heading = this.page.getByRole('heading', { name: /UUID Generator/i });
    await expect(heading).toBeVisible();
  }

  /**
   * Click the generate UUID button
   */
  async clickGenerateUuidButton() {
    // Look for button with "Generate" text
    const button = this.page.getByRole('button', { name: /Generate.*UUID/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Check if at least one UUID is visible in the list
   */
  async expectAtLeastOneUuidVisible() {
    // UUIDs are typically displayed in a list or grid
    // Look for elements containing UUID pattern (8-4-4-4-12 format)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    // Wait for an element containing a UUID
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text);
      }
    );
  }

  // ============================================================================
  // Base64 Tablet
  // ============================================================================

  /**
   * Check if Base64 encoder interface is visible
   */
  async expectBase64InterfaceVisible() {
    // Look for Base64-specific elements (mode selector, input/output areas)
    // Check for "Encode" or "Decode" mode buttons
    const encodeButton = this.page.getByRole('button', { name: /encode/i }).first();
    await expect(encodeButton).toBeVisible();
  }

  /**
   * Type text into the Base64 input field
   * @param text - The text to encode
   */
  async typeIntoBase64Input(text: string) {
    // Find the input textarea - typically has placeholder "Enter text to encode..."
    const input = this.page.getByPlaceholder(/Enter text to encode/i);
    await expect(input).toBeVisible();
    await input.fill(text);

    // Wait a bit for encoding to happen
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the Base64 output value
   */
  async getBase64OutputValue(): Promise<string> {
    // Output is typically in a textarea or pre element
    const outputSelectors = [
      '[data-testid*="output"]',
      'textarea:not([placeholder*="encode"])',
      'pre',
      '[class*="output"]'
    ];

    for (const selector of outputSelectors) {
      const output = this.page.locator(selector).last();
      if (await output.isVisible().catch(() => false)) {
        const value = await output.textContent() || await output.inputValue();
        return value.trim();
      }
    }

    throw new Error('Base64 output not found');
  }

  /**
   * Check if Base64 output contains expected text
   * @param expectedText - The expected encoded text
   */
  async expectBase64OutputContains(expectedText: string) {
    const actualValue = await this.getBase64OutputValue();
    expect(actualValue).toContain(expectedText);
  }
}
