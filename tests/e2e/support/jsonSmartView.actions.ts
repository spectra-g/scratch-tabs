import { Page, expect } from '@playwright/test';

export class JsonSmartViewActions {
  constructor(private page: Page) {}

  // The robust selector for the Smart View's container
  private smartViewContainerSelector = '[data-testid="json-smart-view-container"]'; // ASSUMPTION: Please verify/add this test ID to your component.

  // Core JSON Smart View elements
  getJsonSmartView() {
    // This can now point to the more specific container.
    return this.page.locator(this.smartViewContainerSelector);
  }

  /**
   * New helper to reliably wait for the correct editor instance within the Smart View.
   */
  private async waitForJsonSmartViewEditorAPI() {
    await this.page.waitForFunction((selector) => {
      const smartViewContainer = document.querySelector(selector);
      if (!smartViewContainer) return false;

      const editors = (window as any).monaco?.editor?.getEditors();
      if (!editors || editors.length === 0) return false;

      // Find the specific editor instance that is a child of our smart view container
      const smartViewEditor = editors.find((editor: any) =>
        smartViewContainer.contains(editor.getDomNode())
      );

      // Return true only when that specific editor is found and its model is ready
      return smartViewEditor && smartViewEditor.getModel();
    }, this.smartViewContainerSelector, {
      timeout: 10000,
      polling: 100,
    }).catch(e => {
      throw new Error(`Timed out waiting for the JSON Smart View's Monaco Editor API to be ready. Error: ${e.message}`);
    });
  }

  // REWRITTEN and ROBUST
  async makeJsonEditInSmartView() {
    // 1. Wait for the correct, specific editor API to be ready.
    await this.waitForJsonSmartViewEditorAPI();

    // 2. Execute the edit using the stable API.
    await this.page.evaluate((selector) => {
      const smartViewContainer = document.querySelector(selector);
      if (!smartViewContainer) throw new Error("JSON Smart View container not found in DOM");

      const editors = (window as any).monaco.editor.getEditors();

      const smartViewEditor = editors.find((editor: any) =>
        smartViewContainer.contains(editor.getDomNode())
      );

      if (smartViewEditor) {
        const model = smartViewEditor.getModel();
        if (model) {
          const currentContent = model.getValue();
          // Append text instead of simulating key presses
          model.setValue(currentContent + '\n/* edited */');
        }
      } else {
        throw new Error("Could not find a Monaco editor instance within the JSON Smart View.");
      }
    }, this.smartViewContainerSelector);
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