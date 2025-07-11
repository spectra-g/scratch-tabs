import { Page, expect } from '@playwright/test';

export class ContextMenuActions {
  constructor(private page: Page) {}

  async selectContextMenuOption(optionText: string) {
    await this.page.getByRole('menuitem', { name: optionText }).click();
  }

  async selectFromContextMenu(menuItem: string) {
    // Wait for context menu to appear - look for the custom context menu div
    await this.page.waitForSelector('.bg-gray-700.border.border-gray-600.rounded.shadow-lg.z-50.py-1', { state: 'visible' });
    
    // Use a more flexible selector to find the menu item
    const menuItemSelector = `button:has-text("${menuItem}")`;
    const menuItemElement = this.page.locator(menuItemSelector);
    
    // Wait for the menu item to be visible
    await expect(menuItemElement).toBeVisible();
    
    // Click the menu item
    await menuItemElement.click();
  }

  async selectFromSubmenu(parentItem: string, subItem: string) {
    // First, find and hover over the parent menu item to open submenu
    const parentMenuSelector = `button:has-text("${parentItem}")`;
    const parentElement = this.page.locator(parentMenuSelector);
    
    await expect(parentElement).toBeVisible();
    await parentElement.hover();
    
    // Wait for submenu to appear - look for the submenu div
    await this.page.waitForSelector('.absolute.left-full.ml-1.bg-gray-700.border.border-gray-600.rounded.shadow-lg.z-\\[60\\].py-1', { state: 'visible' });
    
    // Now find and click the submenu item with exact text matching
    const subMenuElement = this.page.getByRole('button', { name: subItem, exact: true });
    
    await expect(subMenuElement).toBeVisible();
    await subMenuElement.click();
  }

  async expectContextMenuIsVisible() {
    const contextMenu = this.page.locator('.bg-gray-700.border.border-gray-600.rounded.shadow-lg.z-50.py-1');
    await expect(contextMenu).toBeVisible();
  }

  async expectContextMenuIsNotVisible() {
    const contextMenu = this.page.locator('.bg-gray-700.border.border-gray-600.rounded.shadow-lg.z-50.py-1');
    await expect(contextMenu).not.toBeVisible();
  }

  async expectContextMenuHasOption(optionText: string) {
    const menuItem = this.page.locator(`button:has-text("${optionText}")`);
    await expect(menuItem).toBeVisible();
  }

  async expectContextMenuDoesNotHaveOption(optionText: string) {
    const menuItem = this.page.locator(`button:has-text("${optionText}")`);
    await expect(menuItem).not.toBeVisible();
  }

  // Helper to dismiss context menu by clicking elsewhere
  async dismissContextMenu() {
    // Click somewhere else to dismiss the context menu
    await this.page.click('body', { position: { x: 0, y: 0 } });
  }
} 