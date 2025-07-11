import { Page, expect } from '@playwright/test';

export class NavigationActions {
  constructor(private page: Page) {}

  async navigateToHome() {
    await this.page.goto('http://localhost:5173/');
    // Wait for the page to load first
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the app to be visible - look for "Scratch Tabs" text
    await expect(this.page.getByText('Scratch Tabs')).toBeVisible();
    await this.waitForPageStabilization();
  }

  async clickButton(buttonText: string) {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }

  async clickLink(linkText: string) {
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }

  async clickIcon(iconTestId: string) {
    // Try multiple selectors for the specified icon
    const selectors = [
      // Playwright's built-in role selector with exact match (most reliable)
      () => this.page.getByRole('button', { name: iconTestId, exact: true }).click(),
      // Title-based selectors with exact match
      () => this.page.getByTitle(iconTestId).click(),
      () => this.page.locator(`[title="${iconTestId}"]`).click(),
      // Legacy selectors for backward compatibility
      () => this.page.locator(`[data-testid="icon-${iconTestId}"]`).click(),
      () => this.page.locator(`[data-testid="${iconTestId}"]`).click(),
      // Partial match selectors (for when exact doesn't work)
      () => this.page.getByRole('button', { name: iconTestId }).click(),
      () => this.page.locator(`[aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`[title*="${iconTestId}"]`).click(),
      // Generic button selectors with the icon text
      () => this.page.locator(`button[aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`button[title*="${iconTestId}"]`).click(),
      () => this.page.locator(`[role="button"][aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`button:has-text("${iconTestId}")`).click(),
      () => this.page.locator(`[role="button"]:has-text("${iconTestId}")`).click()
    ];
    
    for (let i = 0; i < selectors.length; i++) {
      try {
        await selectors[i]();
        console.log(`Successfully clicked icon "${iconTestId}" using selector ${i + 1}`);
        return;
      } catch (error) {
        // Continue to next selector
        console.log(`Selector ${i + 1} failed for "${iconTestId}": ${error.message}`);
      }
    }
    
    // If no selector worked, throw an error with available elements
    console.log(`Could not find icon for "${iconTestId}". Available buttons:`);
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      console.log(`Button: text="${text}", aria-label="${ariaLabel}", title="${title}"`);
    }
    throw new Error(`Could not find icon for "${iconTestId}" using any of the tried selectors`);
  }

  async doubleClickOnPage() {
    // Double-click on the page body
    await this.page.locator('body').dblclick();
  }

  async waitForPageStabilization() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForSeconds(seconds: number) {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async expectUrlContains(expectedUrlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
  }

  async expectTextToExist(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectTextToBeVisible(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectTextToNotBeVisible(text: string) {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }

  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementToNotBeVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async reloadPage() {
    await this.page.reload();
    await this.waitForPageStabilization();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageStabilization();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForPageStabilization();
  }
} 