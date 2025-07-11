import { Page, expect } from '@playwright/test';

export class TabBarActions {
  constructor(private page: Page) {}

  async clickTab(tabTitle: string) {
    // Use the same selector as expectTabExistsAndNotActive
    const tab = this.page.locator(`[role="button"]:has-text("${tabTitle}")`);
    await tab.first().click();
  }

  async rightClickTab(tabTitle: string) {
    const tab = this.page.locator(`[role="button"]:has-text("${tabTitle}")`);
    
    // Get the first matching tab
    const firstTab = tab.first();
    await expect(firstTab).toBeVisible();
    
    // Right click on the tab
    await firstTab.click({ button: 'right' });
  }

  async expectTabIsActive(tabTitle: string) {
    // Active tabs have role="button" and class "bg-gray-600/90"
    const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
    await expect(activeTab).toContainText(tabTitle);
  }

  async expectTabExistsAndNotActive(tabTitle: string) {
    // First check if the tab exists
    const tab = this.page.locator(`[role="button"]:has-text("${tabTitle}")`);
    await expect(tab.first()).toBeVisible();
    
    // Then check if it's not active (active tabs have bg-gray-600/90 class)
    const activeTab = this.page.locator(`[role="button"].bg-gray-600\\/90:has-text("${tabTitle}")`);
    await expect(activeTab).not.toBeVisible();
  }

  async clickThreeDotsMenu() {
    // Click the three dots menu (JSON Options button)
    const threeDots = this.page.locator('button[title="JSON Options"]');
    await threeDots.click();
  }

  async clickNewTabFromPaste() {
    // Click the "New tab with contents from clipboard" button
    await this.page.getByTitle('New tab with contents from clipboard').click();
  }

  async clickNewTablet() {
    // Click the "New tablet" button
    await this.page.getByTitle('New tablet').click();
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
    // Check if the tablet tab is active by looking at the active tab title
    const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
    await expect(activeTab).toContainText(tabletName);
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