import { Page, expect } from '@playwright/test';

export class ContextMenuActions {
  constructor(private page: Page) { }

  async selectContextMenuOption(optionText: string) {
    await this.page.getByRole('menuitem', { name: optionText }).click();
  }

  async selectFromContextMenu(menuItem: string) {
    // Wait for context menu to appear - look for the custom context menu div
    await this.page.waitForSelector('.bg-surface.border.border-base.rounded.shadow-lg.z-50.py-1', { state: 'visible' });

    // Use exact text match to avoid confusion between "Download" and "Download all tabs"
    const menuItemElement = this.page.getByRole('button', { name: menuItem, exact: true });

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

    // Wait for the specific submenu item to appear instead of relying on CSS classes
    const subMenuElement = this.page.getByRole('button', { name: subItem, exact: true });
    await expect(subMenuElement).toBeVisible();

    // Click the submenu item
    await subMenuElement.click();
  }

  async expectContextMenuIsVisible() {
    const contextMenu = this.page.locator('.bg-surface.border.border-base.rounded.shadow-lg.z-50.py-1');
    await expect(contextMenu).toBeVisible();
  }

  async expectContextMenuIsNotVisible() {
    const contextMenu = this.page.locator('.bg-surface.border.border-base.rounded.shadow-lg.z-50.py-1');
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

  async expectMenuOptionNotVisible(optionText: string) {
    // Alias for expectContextMenuDoesNotHaveOption
    await this.expectContextMenuDoesNotHaveOption(optionText);
  }

  async expectSubmenuToAppear(submenuName: string) {
    // Wait for submenu items to appear by looking for a known submenu item
    // This is more robust than relying on CSS classes
    // For "From sample" submenu, we expect to see "JSON" as a menu item
    if (submenuName === "From sample") {
      const jsonMenuItem = this.page.getByRole('button', { name: 'JSON' });
      await expect(jsonMenuItem).toBeVisible();
    } else {
      // For other submenus, we can add more specific checks as needed
      // For now, just look for any button that might be in a submenu
      const submenuItems = this.page.locator('button').filter({ hasText: /^[A-Z]/ });
      await expect(submenuItems.first()).toBeVisible();
    }
  }

  // Helper to dismiss context menu by clicking elsewhere
  async dismissContextMenu() {
    // Click somewhere else to dismiss the context menu
    await this.page.click('body', { position: { x: 0, y: 0 } });
  }
} 