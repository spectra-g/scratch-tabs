import { Page, expect } from '@playwright/test';

export class SmartViewCalloutActions {
  constructor(private page: Page) {}

  getCalloutWidget() {
    return this.page.locator('[data-testid="smart-view-callout"]');
  }

  getCalloutMessage() {
    return this.page.locator('[data-testid="smart-view-callout-message"]');
  }

  getDataViewButton() {
    return this.page.locator('[data-testid="smart-view-callout-data-view"]');
  }

  getDismissButton() {
    return this.page.locator('[data-testid="smart-view-callout-dismiss"]');
  }

  async expectCalloutVisible() {
    const callout = this.getCalloutWidget();
    await expect(callout).toBeVisible();
  }

  async expectCalloutNotVisible() {
    const callout = this.getCalloutWidget();
    await expect(callout).not.toBeVisible();
  }

  async expectCalloutMessageContains(text: string) {
    const message = this.getCalloutMessage();
    await expect(message).toContainText(text);
  }

  async clickDataViewButton() {
    const dataViewButton = this.getDataViewButton();
    await expect(dataViewButton).toBeVisible();
    await dataViewButton.click();
  }

  async clickDismissButton() {
    const dismissButton = this.getDismissButton();
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();
  }

  async expectDataViewButtonVisible() {
    await expect(this.getDataViewButton()).toBeVisible();
  }

  async expectDismissButtonVisible() {
    const dismissButton = this.getDismissButton();
    await expect(dismissButton).toBeVisible();
  }

  async waitForCalloutToAppear() {
    const callout = this.getCalloutWidget();
    await expect(callout).toBeVisible();
  }

  async waitForCalloutToDisappear() {
    const callout = this.getCalloutWidget();
    await expect(callout).not.toBeVisible();
  }

  async isCalloutVisible(): Promise<boolean> {
    const callout = this.getCalloutWidget();
    try {
      await callout.waitFor({ state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  async getCalloutMessageText(): Promise<string | null> {
    const message = this.getCalloutMessage();
    return await message.textContent();
  }

  async expectCalloutContainsFormat(formatName: string) {
    const message = this.getCalloutMessage();
    await expect(message).toContainText(`${formatName} Detected`);
  }
}
