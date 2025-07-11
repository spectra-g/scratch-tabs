import { Page, expect } from '@playwright/test';

export class StatusBarActions {
  constructor(private page: Page) {}

  getStatusBarLanguageLabel() {
    return this.page.locator('[data-testid="status-language"]');
  }

  getStatusBarValidationIcon() {
    return this.page.locator('[data-testid="status-validation"]');
  }

  async expectStatusBarLanguage(language: string) {
    const languageLabel = this.getStatusBarLanguageLabel();
    await expect(languageLabel).toHaveText(language);
  }

  async expectStatusBarValidationTick() {
    const validationIcon = this.getStatusBarValidationIcon();
    await expect(validationIcon).toBeVisible();
    // Check for success/tick icon - this could be a checkmark or similar
    await expect(validationIcon).toHaveAttribute('title', /valid|success|tick/i);
  }

  async expectStatusBarValidationError() {
    const validationIcon = this.getStatusBarValidationIcon();
    await expect(validationIcon).toBeVisible();
    // Check for error icon - this could be an X or similar
    await expect(validationIcon).toHaveAttribute('title', /error|invalid|failed/i);
  }

  async expectStatusBarValidationWarning() {
    const validationIcon = this.getStatusBarValidationIcon();
    await expect(validationIcon).toBeVisible();
    // Check for warning icon - this could be a triangle or similar
    await expect(validationIcon).toHaveAttribute('title', /warning|caution/i);
  }

  async clickStatusBarLanguage() {
    const languageLabel = this.getStatusBarLanguageLabel();
    await languageLabel.click();
  }

  async clickStatusBarValidation() {
    const validationIcon = this.getStatusBarValidationIcon();
    await validationIcon.click();
  }

  async expectStatusBarIsVisible() {
    const statusBar = this.page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible();
  }

  async expectStatusBarIsNotVisible() {
    const statusBar = this.page.locator('[data-testid="status-bar"]');
    await expect(statusBar).not.toBeVisible();
  }

  async expectStatusBarContainsText(text: string) {
    const statusBar = this.page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toContainText(text);
  }

  async expectStatusBarDoesNotContainText(text: string) {
    const statusBar = this.page.locator('[data-testid="status-bar"]');
    await expect(statusBar).not.toContainText(text);
  }

  // Helper methods for common status bar interactions
  async getStatusBarInfo() {
    const statusBar = this.page.locator('[data-testid="status-bar"]');
    const isVisible = await statusBar.isVisible();
    
    if (!isVisible) {
      return { visible: false };
    }

    const language = await this.getStatusBarLanguageLabel().textContent();
    const validationIcon = await this.getStatusBarValidationIcon().isVisible();
    
    return {
      visible: true,
      language,
      hasValidationIcon: validationIcon
    };
  }

  async waitForStatusBarToUpdate() {
    // Wait for the status bar to update after an action
    await this.page.waitForTimeout(500); // Small delay for status bar updates
  }

  async expectLanguageToChange(fromLanguage: string, toLanguage: string) {
    // First verify we start with the expected language
    await this.expectStatusBarLanguage(fromLanguage);
    
    // Wait for change (this would be triggered by some other action)
    await this.page.waitForFunction((expectedLanguage) => {
      const languageElement = document.querySelector('[data-testid="status-language"]');
      return languageElement?.textContent === expectedLanguage;
    }, toLanguage, { timeout: 5000 });
    
    // Verify the change
    await this.expectStatusBarLanguage(toLanguage);
  }
} 