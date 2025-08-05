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
    // First check if tab exists at all
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    
    // Then check if it's active using aria-selected
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

  async clickSmartViewButton() {
    const button = this.page.locator('[data-testid="table-view-button"]');
    await button.click();
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
    // Wait for the tablet selector modal to appear - use the actual CSS classes from the component
    const tabletSelector = this.page.locator('.bg-gray-800.border.border-gray-700.rounded-lg');
    await expect(tabletSelector).toBeVisible();
    
    // Click on the tablet with the specified name - use the actual structure
    const tabletOption = this.page.locator('.font-medium.text-base', { hasText: tabletName });
    await expect(tabletOption).toBeVisible();
    await tabletOption.click();
    
    // Wait for the modal to close after selection
    await expect(tabletSelector).toBeHidden();
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

  async expectTabRenameInputToAppear() {
    // Wait for the rename input to appear - it should be an input field that replaces the tab title
    const renameInput = this.page.locator('input[type="text"]').last();
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toBeFocused();
  }

  async typeInRenameInput(text: string) {
    // Clear existing content and type new text
    const renameInput = this.page.locator('input[type="text"]').last();
    await expect(renameInput).toBeVisible();
    await renameInput.fill(text);
  }

  async pressEnterToConfirmRename() {
    // Press Enter to confirm the rename
    const renameInput = this.page.locator('input[type="text"]').last();
    await expect(renameInput).toBeVisible();
    await renameInput.press('Enter');
  }

  async clickTabOnRightSide(tabTitle: string) {
    // In split view, tabs are shared across both sides, so we can click any tab by its title
    // The "right side" aspect refers to which editor pane becomes active, not tab location
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    await tab.click();
  }

  async expectTabsInOrder(expectedOrder: string) {
    // Parse the expected order string (e.g., "Welcome, Scratch 1, Scratch 3, Scratch 2, Scratch 4")
    const expectedTabNames = expectedOrder.split(',').map(name => name.trim());
    
    // Get all visible tabs in order
    const tabs = this.page.locator('[data-testid^="tab-"]');
    const tabCount = await tabs.count();
    
    // Verify we have the expected number of tabs
    expect(tabCount).toBe(expectedTabNames.length);
    
    // For each tab, check its name by getting the tab title
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      
      // Get the tab title from the tab element's text content or title attribute
      const tabTitle = await tab.textContent();
      
      // Compare with expected tab name
      expect(tabTitle?.trim()).toBe(expectedTabNames[i]);
    }
  }
} 