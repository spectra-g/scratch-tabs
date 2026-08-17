import { Page, expect } from '@playwright/test';

export class StatusBarActions {
  constructor(private page: Page) { }

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
    }, toLanguage);

    // Verify the change
    await this.expectStatusBarLanguage(toLanguage);
  }

  // Smart view switch methods
  getTextViewButton() {
    return this.page.locator('[data-testid="text-view-button"]');
  }

  getDataViewButton() {
    return this.page.locator('[data-testid="data-view-button"]');
  }

  async expectDataViewSwitchVisible() {
    await expect(this.getTextViewButton()).toBeVisible();
    await expect(this.getDataViewButton()).toBeVisible();
  }

  async expectDataViewSwitchNotVisible() {
    await expect(this.getTextViewButton()).not.toBeVisible();
    await expect(this.getDataViewButton()).not.toBeVisible();
  }

  async expectTextViewSelected() {
    await expect(this.getTextViewButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(this.getDataViewButton()).toHaveAttribute('aria-pressed', 'false');
  }

  async expectDataViewSelected() {
    await expect(this.getDataViewButton()).toHaveAttribute('aria-pressed', 'true');
    await expect(this.getTextViewButton()).toHaveAttribute('aria-pressed', 'false');
  }

  async clickDataViewButton() {
    await this.getDataViewButton().click();
  }

  async clickTextViewButton() {
    await this.getTextViewButton().click();
  }

  async waitForLanguageDetection(expectedLanguage: string) {
    await this.page.waitForFunction((language) => {
      const languageElement = document.querySelector('[data-testid="status-language"]');
      return languageElement?.textContent === language;
    }, expectedLanguage);
  }

  async expectExtendedViewButtonsVisible() {
    const extendedViewButtons = this.page.locator('[data-testid="extended-view-buttons"]');
    await expect(extendedViewButtons).toBeVisible();
  }

  async expectExtendedViewButtonsNotVisible() {
    const extendedViewButtons = this.page.locator('[data-testid="extended-view-buttons"]');
    await expect(extendedViewButtons).not.toBeVisible();
  }

  // Format popup search functionality
  getFormatSelectionPopup() {
    return this.page.locator('[data-testid="format-selection-popup"]');
  }

  getFormatSearchInput() {
    return this.page.locator('input[placeholder="Search formats..."]');
  }

  async expectFormatPopupVisible() {
    const popup = this.getFormatSelectionPopup();
    await expect(popup).toBeVisible();
  }

  async expectFormatPopupNotVisible() {
    const popup = this.getFormatSelectionPopup();
    await expect(popup).not.toBeVisible();
  }

  async expectFormatSearchInputVisible() {
    const searchInput = this.getFormatSearchInput();
    await expect(searchInput).toBeVisible();
  }

  async expectFormatSearchInputFocused() {
    const searchInput = this.getFormatSearchInput();
    await expect(searchInput).toBeFocused();
  }

  async typeInFormatSearch(text: string) {
    const searchInput = this.getFormatSearchInput();
    await searchInput.fill(text);
  }

  async clearFormatSearch() {
    const searchInput = this.getFormatSearchInput();
    await searchInput.clear();
  }

  async expectFormatOptionVisible(formatName: string) {
    const popup = this.getFormatSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${formatName}$`) });
    await expect(option).toBeVisible();
  }

  async expectFormatOptionNotVisible(formatName: string) {
    const popup = this.getFormatSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${formatName}$`) });
    await expect(option).not.toBeVisible();
  }

  async clickFormatOption(formatName: string) {
    const popup = this.getFormatSelectionPopup();
    const option = popup.locator('button').filter({ hasText: new RegExp(`^${formatName}$`) });
    await option.click();
  }

  async expectNoFormatsFoundMessage() {
    const popup = this.getFormatSelectionPopup();
    const message = popup.locator('text=No formats found');
    await expect(message).toBeVisible();
  }

  async expectFormatPopupContainsFormatsWithText(text: string) {
    const popup = this.getFormatSelectionPopup();
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

  async getAllVisibleFormatOptions(): Promise<string[]> {
    const popup = this.getFormatSelectionPopup();
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

  // Rich Text functionality
  getRichTextToggle(side: 'left' | 'right' = 'left') {
    return this.page.locator(`[data-editor-pane-side="${side}"] [data-testid="rich-text-toggle"]`);
  }

  async expectRichTextToggleVisible(side: 'left' | 'right' = 'left') {
    const richTextToggle = this.getRichTextToggle(side);
    await expect(richTextToggle).toBeVisible();
  }

  async expectRichTextToggleNotVisible(side: 'left' | 'right' = 'left') {
    const richTextToggle = this.getRichTextToggle(side);
    await expect(richTextToggle).not.toBeVisible();
  }

  async clickRichTextToggle(side: 'left' | 'right' = 'left') {
    const richTextToggle = this.getRichTextToggle(side);
    await expect(richTextToggle).toBeVisible();
    await richTextToggle.click();

    // Wait for the editor mode to switch
    await this.page.waitForFunction(() => {
      // Wait for DOM changes to stabilize after the toggle
      return document.readyState === 'complete';
    });
  }

  async expectRichTextToggleText(text: 'Rich' | 'Text', side: 'left' | 'right' = 'left') {
    const richTextToggle = this.getRichTextToggle(side);
    await expect(richTextToggle).toContainText(text);
  }

  async expectRichTextToggleTitle(title: string, side: 'left' | 'right' = 'left') {
    const richTextToggle = this.getRichTextToggle(side);
    await expect(richTextToggle).toHaveAttribute('title', title);
  }
} 
