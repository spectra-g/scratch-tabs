import { Page, expect } from '@playwright/test';

export class JsonSmartViewActions {
  constructor(private page: Page) {}

  // Core JSON Smart View elements
  getJsonSmartView() {
    return this.page.locator('[data-testid="json-tree-view"]');
  }

  async expectJsonSmartViewVisible() {
    const jsonSmartView = this.getJsonSmartView();
    await expect(jsonSmartView).toBeVisible();
  }

  async expectJsonSmartViewNotVisible() {
    const jsonSmartView = this.getJsonSmartView();
    await expect(jsonSmartView).not.toBeVisible();
  }

  async expectJsonSmartViewContainsText(text: string) {
    const jsonSmartView = this.getJsonSmartView();
    await expect(jsonSmartView).toContainText(text);
  }

  // Get the Monaco editor within the JSON Smart View
  getJsonSmartViewEditor() {
    // The Monaco editor is in the center panel of the JSON Smart View, not inside the tree view
    // Look for Monaco editor when JSON Smart View is active
    return this.page.locator('.monaco-editor textarea').first();
  }

  async makeJsonEditInSmartView() {
    // Make a simple edit to the JSON content in the smart view editor
    const editor = this.getJsonSmartViewEditor();
    await editor.waitFor();

    // Make a simple edit - just add some text at the end
    await editor.press('End');
    await editor.type(' /* edited */');
  }
}