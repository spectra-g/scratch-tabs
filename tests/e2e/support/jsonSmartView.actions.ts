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

  async expandJsonTreeToPath(targetPath: string) {
    // Expand all parent nodes needed to make the target path visible
    const pathParts = targetPath.split(/[.\[\]]+/).filter(Boolean);
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const isArrayIndex = /^\d+$/.test(part);
      
      if (i === 0 && !isArrayIndex) {
        currentPath = part;
      } else if (isArrayIndex) {
        currentPath = currentPath ? `${currentPath}[${part}]` : `[${part}]`;
      } else {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
      }
      
      // Try to expand this level if it's expandable
      const expandButton = this.page.locator(`[data-testid="json-node-${currentPath}"] .expand-button, [data-testid="json-node-${currentPath}"] button`).first();
      
      // Only click if the expand button exists and is visible
      if (await expandButton.isVisible().catch(() => false)) {
        await expandButton.click();
      }
    }
  }

  async clickJsonTreeNode(nodePath: string) {
    // First expand the tree to make the node visible
    await this.expandJsonTreeToPath(nodePath);
    
    // Click on a specific JSON tree node using its path
    const treeNode = this.page.locator(`[data-testid="json-node-${nodePath}"]`);
    await expect(treeNode).toBeVisible();
    await treeNode.click();
  }
}