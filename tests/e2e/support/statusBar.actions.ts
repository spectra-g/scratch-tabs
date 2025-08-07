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

  // CSV-specific methods
  getTableViewButton() {
    return this.page.locator('[title="Open Table View"], [title="Close Table View"]');
  }

  async expectTableViewButtonVisible() {
    const tableViewButton = this.getTableViewButton();
    await expect(tableViewButton).toBeVisible();
  }

  async expectTableViewButtonNotVisible() {
    const openButton = this.page.locator('[title="Open Table View"]');
    const closeButton = this.page.locator('[title="Close Table View"]');
    await expect(openButton).not.toBeVisible();
    await expect(closeButton).not.toBeVisible();
  }

  async clickTableViewButton() {
    const openButton = this.page.locator('[title="Open Table View"]');
    const closeButton = this.page.locator('[title="Close Table View"]');
    
    if (await openButton.isVisible()) {
      await openButton.click();
    } else if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      throw new Error('Table View button not found');
    }
    
    // Wait for view transition
    await this.page.waitForTimeout(500);
  }

  async isTableViewOpen() {
    const closeButton = this.page.locator('[title="Close Table View"]');
    return await closeButton.isVisible();
  }

  async waitForLanguageDetection(expectedLanguage: string, timeout: number = 5000) {
    await this.page.waitForFunction((language) => {
      const languageElement = document.querySelector('[data-testid="status-language"]');
      return languageElement?.textContent === language;
    }, expectedLanguage, { timeout });
  }

  async expectExtendedViewButtonsVisible() {
    const extendedViewButtons = this.page.locator('[data-testid="extended-view-buttons"]');
    await expect(extendedViewButtons).toBeVisible();
  }

  async expectExtendedViewButtonsNotVisible() {
    const extendedViewButtons = this.page.locator('[data-testid="extended-view-buttons"]');
    await expect(extendedViewButtons).not.toBeVisible();
  }

  // Language popup search functionality
  getLanguageSelectionPopup() {
    return this.page.locator('.absolute.z-50.bg-gray-800');
  }

  getLanguageSearchInput() {
    return this.page.locator('input[placeholder="Search formats..."]');
  }

  async expectLanguagePopupVisible() {
    const popup = this.getLanguageSelectionPopup();
    await expect(popup).toBeVisible();
  }

  async expectLanguagePopupNotVisible() {
    const popup = this.getLanguageSelectionPopup();
    await expect(popup).not.toBeVisible();
  }

  async expectLanguageSearchInputVisible() {
    const searchInput = this.getLanguageSearchInput();
    await expect(searchInput).toBeVisible();
  }

  async expectLanguageSearchInputFocused() {
    const searchInput = this.getLanguageSearchInput();
    await expect(searchInput).toBeFocused();
  }

  async typeInLanguageSearch(text: string) {
    const searchInput = this.getLanguageSearchInput();
    await searchInput.fill(text);
  }

  async clearLanguageSearch() {
    const searchInput = this.getLanguageSearchInput();
    await searchInput.clear();
  }

  async expectLanguageOptionVisible(languageName: string) {
    const popup = this.getLanguageSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${languageName}$`) });
    await expect(option).toBeVisible();
  }

  async expectLanguageOptionNotVisible(languageName: string) {
    const popup = this.getLanguageSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${languageName}$`) });
    await expect(option).not.toBeVisible();
  }

  async clickLanguageOption(languageName: string) {
    const popup = this.getLanguageSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${languageName}$`) });
    await option.click();
  }

  async expectNoFormatsFoundMessage() {
    const popup = this.getLanguageSelectionPopup();
    const message = popup.locator('text=No formats found');
    await expect(message).toBeVisible();
  }

  async expectLanguagePopupContainsFormatsWithText(text: string) {
    const popup = this.getLanguageSelectionPopup();
    const options = popup.locator('button');
    const count = await options.count();
    
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const optionText = await option.textContent();
      if (optionText && !optionText.toLowerCase().includes(text.toLowerCase())) {
        throw new Error(`Found format "${optionText}" that doesn't contain "${text}"`);
      }
    }
  }

  async getAllVisibleLanguageOptions(): Promise<string[]> {
    const popup = this.getLanguageSelectionPopup();
    const options = popup.locator('button');
    const count = await options.count();
    const optionTexts: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const option = options.nth(i);
      const text = await option.textContent();
      if (text) {
        optionTexts.push(text.trim());
      }
    }
    
    return optionTexts;
  }
} 