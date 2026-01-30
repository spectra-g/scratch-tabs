import { Page, expect } from '@playwright/test';

/**
 * SidebarActions - Encapsulates sidebar-specific interactions
 *
 * Handles interactions with the workspace sidebar (Project Explorer):
 * - Sidebar visibility toggle
 * - Workspace expand/collapse
 * - Tab navigation in sidebar
 * - Icon rail interactions
 * - Visual state verification
 */
export class SidebarActions {
  constructor(private page: Page) { }

  /**
   * Toggle sidebar visibility using keyboard shortcut (Cmd+B or Ctrl+B)
   */
  async toggleSidebarWithKeyboard() {
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+b`);
  }

  /**
   * Check if sidebar is visible
   */
  async isSidebarVisible(): Promise<boolean> {
    const sidebar = this.page.locator('[data-testid="sidebar"]');
    try {
      await expect(sidebar).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if icon rail is visible (shown when sidebar is collapsed)
   */
  async isIconRailVisible(): Promise<boolean> {
    const iconRail = this.page.locator('[data-testid="icon-rail"]');
    try {
      await expect(iconRail).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Expect sidebar to be visible
   */
  async expectSidebarVisible() {
    const sidebar = this.page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
  }

  /**
   * Expect sidebar to be hidden
   */
  async expectSidebarHidden() {
    const sidebar = this.page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
  }

  /**
   * Expect icon rail to be visible
   */
  async expectIconRailVisible() {
    const iconRail = this.page.locator('[data-testid="icon-rail"]');
    await expect(iconRail).toBeVisible();
  }

  /**
   * Expect icon rail to be hidden
   */
  async expectIconRailHidden() {
    const iconRail = this.page.locator('[data-testid="icon-rail"]');
    await expect(iconRail).not.toBeVisible();
  }

  /**
   * Click on a workspace in the sidebar to expand/collapse it
   * @param workspaceName - The name of the workspace to click
   */
  async clickWorkspace(workspaceName: string) {
    // First, find the workspace by its name in the sidebar
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toBeVisible();
    await workspace.click();
  }

  /**
   * Check if a workspace is expanded in the sidebar
   * @param workspaceName - The name of the workspace to check
   */
  async isWorkspaceExpanded(workspaceName: string): Promise<boolean> {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    const ariaExpanded = await workspace.getAttribute('aria-expanded');
    return ariaExpanded === 'true';
  }

  /**
   * Expect workspace to be expanded
   * @param workspaceName - The name of the workspace
   */
  async expectWorkspaceExpanded(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toHaveAttribute('aria-expanded', 'true');
  }

  /**
   * Expect workspace to be collapsed
   * @param workspaceName - The name of the workspace
   */
  async expectWorkspaceCollapsed(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toHaveAttribute('aria-expanded', 'false');
  }

  /**
   * Click on a tab in the sidebar
   * @param tabTitle - The title of the tab to click
   */
  async clickTabInSidebar(tabTitle: string) {
    const tab = this.page.locator('[data-testid^="sidebar-tab-"]').filter({ hasText: tabTitle }).first();
    await expect(tab).toBeVisible();
    await tab.click();
  }

  /**
   * Check if a tab is visible in the sidebar
   * @param tabTitle - The title of the tab to check
   */
  async isTabVisibleInSidebar(tabTitle: string): Promise<boolean> {
    const tab = this.page.locator('[data-testid^="sidebar-tab-"]').filter({ hasText: tabTitle }).first();
    try {
      await expect(tab).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Expect tab to be visible in sidebar
   * @param tabTitle - The title of the tab
   */
  async expectTabVisibleInSidebar(tabTitle: string) {
    const tab = this.page.locator('[data-testid^="sidebar-tab-"]').filter({ hasText: tabTitle }).first();
    await expect(tab).toBeVisible();
  }

  /**
   * Check if a workspace is marked as active (bold, colored border)
   * @param workspaceName - The name of the workspace to check
   */
  async isWorkspaceActive(workspaceName: string): Promise<boolean> {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    const ariaSelected = await workspace.getAttribute('aria-selected');
    return ariaSelected === 'true';
  }

  /**
   * Expect workspace to be marked as active
   * @param workspaceName - The name of the workspace
   */
  async expectWorkspaceActive(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Expect workspace to be inactive
   * @param workspaceName - The name of the workspace
   */
  async expectWorkspaceInactive(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toHaveAttribute('aria-selected', 'false');
  }

  /**
   * Get the tab count badge text for a workspace
   * @param workspaceName - The name of the workspace
   */
  async getWorkspaceTabCount(workspaceName: string): Promise<string> {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    const badge = workspace.locator('[data-testid$="-badge"]');
    return await badge.textContent() || '';
  }

  /**
   * Expect workspace to have specific tab count
   * @param workspaceName - The name of the workspace
   * @param count - Expected number of tabs
   */
  async expectWorkspaceTabCount(workspaceName: string, count: number) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    const badge = workspace.locator('[data-testid$="-badge"]');
    await expect(badge).toContainText(`${count} tab`);
  }

  /**
   * Right-click on a workspace to open context menu
   * @param workspaceName - The name of the workspace
   */
  async rightClickWorkspace(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    await expect(workspace).toBeVisible();
    await workspace.click({ button: 'right' });
  }

  /**
   * Right-click on a tab in the sidebar to open context menu
   * @param tabTitle - The title of the tab
   */
  async rightClickTabInSidebar(tabTitle: string) {
    const tab = this.page.locator('[data-testid^="sidebar-tab-"]').filter({ hasText: tabTitle }).first();
    await expect(tab).toBeVisible();
    await tab.click({ button: 'right' });
  }

  /**
   * Click on a workspace icon in the icon rail
   * @param workspaceName - The name of the workspace (or index if using icon position)
   */
  async clickWorkspaceIconInRail(workspaceName: string) {
    const iconRail = this.page.locator('[data-testid="icon-rail"]');
    await expect(iconRail).toBeVisible();

    // Try to find by workspace name in tooltip or data attribute
    const icon = iconRail.locator('[data-testid^="icon-rail-workspace-"]').filter({ hasText: workspaceName.charAt(0).toUpperCase() }).first();
    await icon.click();
  }

  /**
   * Hover over a workspace icon in the icon rail
   * @param workspaceName - The name of the workspace
   */
  async hoverWorkspaceIconInRail(workspaceName: string) {
    const iconRail = this.page.locator('[data-testid="icon-rail"]');
    await expect(iconRail).toBeVisible();

    const icon = iconRail.locator('[data-testid^="icon-rail-workspace-"]').filter({ hasText: workspaceName.charAt(0).toUpperCase() }).first();
    await icon.hover();
  }

  /**
   * Expect tooltip to be visible with specific text
   * @param text - Expected tooltip text
   */
  async expectTooltipVisible(text: string) {
    const tooltip = this.page.locator('[role="tooltip"]').filter({ hasText: text }).first();
    await expect(tooltip).toBeVisible();
  }

  /**
   * Check if "Switching" feedback is visible
   */
  async isSwitchingFeedbackVisible(): Promise<boolean> {
    const feedback = this.page.locator('text=/Switching/i').first();
    try {
      await expect(feedback).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for "Switching" feedback to appear and disappear
   */
  async waitForWorkspaceSwitch() {
    // Wait for switching feedback to appear
    const feedback = this.page.locator('text=/Switching/i').first();
    await expect(feedback).toBeVisible();

    // Wait for it to disappear (switch complete)
    await expect(feedback).not.toBeVisible();
  }

  /**
   * Expand a workspace in the sidebar
   * @param workspaceName - The name of the workspace to expand
   */
  async expandWorkspace(workspaceName: string) {
    const isExpanded = await this.isWorkspaceExpanded(workspaceName);
    if (!isExpanded) {
      await this.clickWorkspace(workspaceName);
      await this.expectWorkspaceExpanded(workspaceName);
    }
  }

  /**
   * Collapse a workspace in the sidebar
   * @param workspaceName - The name of the workspace to collapse
   */
  async collapseWorkspace(workspaceName: string) {
    const isExpanded = await this.isWorkspaceExpanded(workspaceName);
    if (isExpanded) {
      await this.clickWorkspace(workspaceName);
      await this.expectWorkspaceCollapsed(workspaceName);
    }
  }

  /**
   * Create a new workspace from the sidebar
   */
  async createWorkspaceFromSidebar() {
    const createButton = this.page.locator('[data-testid="sidebar-create-workspace"]');
    await expect(createButton).toBeVisible();
    await createButton.click();
  }

  /**
   * Get the expand/collapse arrow element for a workspace
   * @param workspaceName - The name of the workspace
   */
  private getWorkspaceArrow(workspaceName: string) {
    const workspace = this.page.locator('[data-testid^="sidebar-workspace-"]').filter({ hasText: workspaceName }).first();
    return workspace.locator('[data-testid$="-expand"]');
  }

  /**
   * Expect the expand arrow to be in collapsed state (▶)
   * @param workspaceName - The name of the workspace
   */
  async expectArrowInCollapsedState(workspaceName: string) {
    await this.expectWorkspaceCollapsed(workspaceName);
  }

  /**
   * Expect the expand arrow to be in expanded state (▼)
   * @param workspaceName - The name of the workspace
   */
  async expectArrowInExpandedState(workspaceName: string) {
    await this.expectWorkspaceExpanded(workspaceName);
  }

  /**
   * Type text into the workspace rename input
   * @param text - The new name for the workspace
   */
  async typeInWorkspaceRenameInput(text: string) {
    const input = this.page.getByTestId('workspace-rename-input');
    await expect(input).toBeVisible();
    await input.fill(text);
  }

  /**
   * Wait for workspace to be visible
   * @param workspaceName - The new name for the workspace
   */
  async waitForWorkspaceToBeVisible(workspaceName: string) {
    const workspace = this.page.getByRole('button', { name: workspaceName });
    await expect(workspace).toBeVisible();
  }
}
