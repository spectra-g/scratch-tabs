const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

export { }; // Make this file a module to avoid global scope conflicts

// ============================================================================
// WHEN Steps - Actions
// ============================================================================

When('I press {string} to toggle the sidebar', async function (_shortcut: string) {
  await this.sidebar.toggleSidebarWithKeyboard();
});

When('I click on workspace {string} in the sidebar', async function (workspaceName: string) {
  await this.sidebar.clickWorkspace(workspaceName);
});

When('I click on tab {string} in the sidebar', async function (tabTitle: string) {
  await this.sidebar.clickTabInSidebar(tabTitle);
});

When('I click the create workspace button in sidebar', async function () {
  await this.sidebar.createWorkspaceFromSidebar();
});

When('I click on workspace icon for {string} in icon rail', async function (workspaceName: string) {
  await this.sidebar.clickWorkspaceIconInRail(workspaceName);
});

When('I right-click on workspace {string} in the sidebar', async function (workspaceName: string) {
  await this.sidebar.rightClickWorkspace(workspaceName);
});

When('I type {string} in the workspace rename input', async function (text: string) {
  await this.sidebar.typeInWorkspaceRenameInput(text);
});

// ============================================================================
// THEN Steps - Assertions
// ============================================================================

Then('the sidebar should be visible', async function () {
  await this.sidebar.expectSidebarVisible();
});

Then('the sidebar should be hidden', async function () {
  await this.sidebar.expectSidebarHidden();
});

Then('the icon rail should be visible', async function () {
  await this.sidebar.expectIconRailVisible();
});

Then('workspace {string} should be expanded in the sidebar', async function (workspaceName: string) {
  await this.sidebar.expectWorkspaceExpanded(workspaceName);
});

Then('workspace {string} should be collapsed in the sidebar', async function (workspaceName: string) {
  await this.sidebar.expectWorkspaceCollapsed(workspaceName);
});

Then('I should see tabs in the expanded workspace', async function () {
  const tabs = await this.page.locator('[data-testid^="sidebar-tab-"]').count();
  expect(tabs).toBeGreaterThan(0);
});

Then('tab {string} should be active in the tab bar', async function (tabTitle: string) {
  await this.tabBar.expectTabIsActive(tabTitle);
});

Then('tab {string} should show active indicator in sidebar', async function (tabTitle: string) {
  const activeTab = this.page.locator(`[data-testid^="sidebar-tab-"][aria-selected="true"]`);
  await expect(activeTab).toBeVisible();
  await expect(activeTab).toContainText(tabTitle);
});

Then('workspace {string} should be marked as active in sidebar', async function (workspaceName: string) {
  await this.sidebar.expectWorkspaceActive(workspaceName);
});

Then('workspace {string} should not be marked as active in sidebar', async function (workspaceName: string) {
  await this.sidebar.expectWorkspaceInactive(workspaceName);
});

Then('I should see workspace icons in the icon rail', async function () {
  const icons = this.page.locator('[data-testid^="icon-rail-workspace-"]');
  const count = await icons.count();
  expect(count).toBeGreaterThan(0);
  await expect(icons.first()).toBeVisible();
});

Then('the {string} workspace should be visible', async function (workspaceName: string) {
  await this.sidebar.waitForWorkspaceToBeVisible(workspaceName);
});
