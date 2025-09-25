import { Page, expect } from '@playwright/test';

export class SvgSmartViewActions {
  constructor(private page: Page) {}

  // Core SVG Smart View elements
  getSvgSmartView() {
    return this.page.locator('[data-testid="svg-container"]');
  }

  async expectSvgSmartViewVisible() {
    const svgSmartView = this.getSvgSmartView();
    await expect(svgSmartView).toBeVisible();
  }

  async expectSvgSmartViewNotVisible() {
    const svgSmartView = this.getSvgSmartView();
    await expect(svgSmartView).not.toBeVisible();
  }

  async expectSvgPreviewVisible() {
    const svgContainer = this.getSvgSmartView();
    await expect(svgContainer).toBeVisible();
    
    // Check that the SVG container contains actual SVG content
    const svgElement = this.page.locator('[data-testid="svg-container"] svg');
    await expect(svgElement).toBeVisible();
  }

  async expectSvgSmartViewContainsText(text: string) {
    const svgSmartView = this.getSvgSmartView();
    await expect(svgSmartView).toContainText(text);
  }
}