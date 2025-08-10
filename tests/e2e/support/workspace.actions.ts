import { Page, expect as expectWorkspace } from '@playwright/test';

export class WorkspaceActions {
  constructor(private page: Page) {}

  async waitForWorkspaceToBeVisible(workspaceName: string) {
    const workspace = this.page.locator(`[data-testid="workspace-switcher"][aria-label="${workspaceName}"]`);
    await expectWorkspace(workspace).toBeVisible();
  }

  async clickWorkspaceSwitcher() {
    await this.page.locator('[data-testid="workspace-switcher"]').click();
  }

  async clickNewWorkspaceButton() {
    await this.page.locator('button:has-text("New workspace")').click();
  }

  async typeWorkspaceName(workspaceName: string) {
    await this.page.locator('input[placeholder="Workspace name"]').type(workspaceName);
  }

  async clickCreateWorkspaceButton() {
    await this.page.locator('button:has-text("Create")').click();
  }

  async waitForWorkspaceToNotBeVisible(workspaceName: string) {
    const workspace = this.page.locator(`[data-testid="workspace-switcher"][aria-label="${workspaceName}"]`);
    await expectWorkspace(workspace).not.toBeVisible();
  }

  async clickWorkspace(workspaceName: string) {
    // Click on a workspace item in the dropdown
    await this.page.locator(`text="${workspaceName}"`).first().click();
    
    // Wait for the workspace to be fully loaded by waiting for the button to update
    const workspaceButton = this.page.locator(`[data-testid="workspace-switcher"][aria-label="${workspaceName}"]`);
    await expectWorkspace(workspaceButton).toBeVisible();
  }
}
