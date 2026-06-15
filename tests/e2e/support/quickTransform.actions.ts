import { Page, expect } from '@playwright/test';

export class QuickTransformActions {
  constructor(private page: Page) {}

  /**
   * Open the Quick Transform modal by programmatically triggering the Monaco action.
   * This calls the same run() callback as clicking "Quick Transform" in the editor
   * context menu, and is more reliable in headless Playwright than a right-click
   * because it bypasses OS-level context menu handling differences.
   */
  async openModal(): Promise<void> {
    await this.page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors() || [];
      const editor = editors[0];
      if (!editor) throw new Error('Monaco editor not found');
      editor.trigger('e2e', 'quick-transform', null);
    });
  }

  /**
   * Right-click the editor and verify "Quick Transform" appears in Monaco's context menu,
   * then dismiss without selecting it. Use this only to test the menu entry is registered.
   */
  async verifyContextMenuEntry(): Promise<void> {
    const selector = '[data-editor-pane-side="left"] .monaco-editor';
    const editorHandle = await this.page.waitForFunction(
      (cssSelector: string) => {
        const container = document.querySelector(cssSelector);
        if (!container) return null;
        const allEditors = (window as any).monaco?.editor?.getEditors() || [];
        return allEditors.find((e: any) => {
          const domNode = e.getDomNode();
          return domNode && container.contains(domNode);
        }) || null;
      },
      selector,
    );

    const domNodeHandle = await editorHandle.evaluateHandle((editor: any) => editor.getDomNode());
    const domElement = domNodeHandle.asElement();
    if (!domElement) throw new Error('Monaco editor DOM node not found');
    await domElement.click({ button: 'right' });

    const menuItem = this.page.getByRole('menuitem', { name: 'Quick Transform' });
    await expect(menuItem).toBeVisible({ timeout: 5000 });

    // Dismiss without selecting
    await this.page.keyboard.press('Escape');
    await expect(menuItem).not.toBeVisible({ timeout: 2000 });
  }

  async expectModalVisible(): Promise<void> {
    await expect(this.page.getByTestId('quick-transform-search')).toBeVisible();
  }

  async expectModalNotVisible(): Promise<void> {
    await expect(this.page.getByTestId('quick-transform-search')).not.toBeVisible();
  }

  async searchFor(query: string): Promise<void> {
    const input = this.page.getByTestId('quick-transform-search');
    await expect(input).toBeVisible();
    await input.pressSequentially(query, { delay: 30 });
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async selectFirstResult(): Promise<void> {
    await this.page.getByTestId('quick-transform-search').press('Enter');
  }

  async expectParamsFormVisible(): Promise<void> {
    await expect(this.page.getByTestId('quick-transform-params-form')).toBeVisible();
  }

  async expectParamsFormNotVisible(): Promise<void> {
    await expect(this.page.getByTestId('quick-transform-params-form')).not.toBeVisible();
  }

  async fillFirstTextField(value: string): Promise<void> {
    const form = this.page.getByTestId('quick-transform-params-form');
    await form.getByRole('textbox').first().fill(value);
  }

  async clickApply(): Promise<void> {
    await this.page.getByRole('button', { name: '↵ apply' }).click();
  }

  async clickBack(): Promise<void> {
    await this.page.getByLabel('Back to search').click();
  }
}
