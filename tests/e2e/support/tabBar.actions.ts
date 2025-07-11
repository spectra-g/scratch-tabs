import { Page, expect } from '@playwright/test';

export class TabBarActions {
  constructor(private page: Page) {}

  async clickTab(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await tab.click();
  }

  async rightClickTab(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    await tab.click({ button: 'right' });
  }

  async expectTabIsActive(tabTitle: string) {
    // Use stable ARIA attribute instead of brittle CSS classes
    const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
    await expect(activeTab).toBeVisible();
  }

  async expectTabExistsAndNotActive(tabTitle: string) {
    // First check if the tab exists
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    
    // Then check if it's not active using aria-selected
    const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
    await expect(activeTab).not.toBeVisible();
  }

  async clickThreeDotsMenu() {
    // Click the three dots menu (JSON Options button)
    const threeDots = this.page.locator('button[title="JSON Options"]');
    await threeDots.click();
  }

  async clickNewTabFromPaste() {
    // Use stable test ID instead of title
    const button = this.page.locator('[data-testid="icon-new-tab-from-clipboard"]');
    await button.click();
  }

  async clickNewTablet() {
    // Use stable test ID instead of title
    const button = this.page.locator('[data-testid="icon-new-tablet"]');
    await button.click();
  }

  async selectTablet(tabletName: string) {
    // Wait for the tablet selector modal to appear
    const tabletSelector = this.page.locator('.bg-gray-800.border.border-gray-700.rounded-lg');
    await tabletSelector.waitFor({ state: 'visible' });
    
    // Click on the tablet with the specified name
    const tabletOption = this.page.locator('.font-medium.text-base', { hasText: tabletName });
    await tabletOption.click();
  }

  async expectTabletIsActive(tabletName: string) {
    // Use stable ARIA attribute instead of brittle CSS classes
    const activeTab = this.page.locator(`[data-testid="tab-${tabletName}"][aria-selected="true"]`);
    await expect(activeTab).toBeVisible();
  }

  async clickOpenSpecializedTablet() {
    // This button is on the welcome screen - look for the button with the text "Open specialized tablet"
    const button = this.page.locator('button:has-text("Open specialized tablet")');
    await expect(button).toBeVisible();
    await button.click();
  }

  async clickImportFromClipboard() {
    // This button is on the welcome screen - look for the button with the text "Import from clipboard"
    const button = this.page.locator('button:has-text("Import from clipboard")');
    await expect(button).toBeVisible();
    await button.click();
  }
} 