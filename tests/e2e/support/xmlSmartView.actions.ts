import { Page, expect } from '@playwright/test';

export class XmlSmartViewActions {
  constructor(private page: Page) {}

  getContainer() {
    return this.page.locator('[data-testid="xml-smart-view-container"]');
  }

  async expectVisible() {
    await expect(this.getContainer()).toBeVisible();
  }

  async expectNotVisible() {
    await expect(this.getContainer()).not.toBeVisible();
  }

  async expectContainsText(text: string) {
    await expect(this.getContainer()).toContainText(text);
  }

  async clickToolbarButton(label: string) {
    await this.getContainer().getByRole('button', { name: label }).click();
  }

  async clickBottomTab(label: string) {
    const testId = `xml-bottom-tab-${label.toLowerCase()}`;
    await this.page.locator(`[data-testid="${testId}"]`).click();
  }

  async expectXPathWorkbenchVisible() {
    await expect(this.page.locator('[data-testid="xml-xpath-workbench"]')).toBeVisible();
  }
}
