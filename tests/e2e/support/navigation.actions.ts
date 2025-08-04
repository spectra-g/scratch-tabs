import { Page, expect } from '@playwright/test';

export class NavigationActions {
  constructor(private page: Page) {}

  async navigateToHome() {
    await this.page.goto('http://localhost:5173/');
    // Wait for the page to load first
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the app to be visible - look for "Scratch Tabs" text
    await expect(this.page.getByText('Scratch Tabs')).toBeVisible();
    await this.waitForPageStabilization();
  }

  async clickButton(buttonText: string) {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }

  async clickLink(linkText: string) {
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }

  async clickIcon(iconName: string, side: 'left' | 'right' = 'left') {
    // Map human-readable names to test IDs
    const iconTestIdMap: { [key: string]: string } = {
      'New tab': 'icon-new-tab',
      'New tab with contents from clipboard': 'icon-new-tab-from-clipboard', 
      'New tablet': 'icon-new-tablet'
    };
    
    const testId = iconTestIdMap[iconName] || `icon-${iconName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check if we're in split view mode
    const splitViewExists = await this.page.locator('[data-editor-pane-side="right"]').isVisible();
    
    let locator;
    if (splitViewExists) {
      // In split view, use the specified side
      locator = this.page.locator(`[data-testid="${testId}"][data-side="${side}"]`);
    } else {
      // Not in split view, use simple selector
      locator = this.page.locator(`[data-testid="${testId}"]`);
    }
    
    await expect(locator).toBeVisible();
    await locator.click();
  }

  async doubleClickOnPage() {
    // Double-click on the page body
    await this.page.locator('body').dblclick();
  }

  async waitForPageStabilization() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForSeconds(seconds: number) {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async expectUrlContains(expectedUrlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
  }

  async expectTextToExist(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectTextToBeVisible(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectTextToNotBeVisible(text: string) {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }

  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementToNotBeVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async reloadPage() {
    await this.page.reload();
    await this.waitForPageStabilization();
  }

  async refreshPage() {
    await this.reloadPage();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageStabilization();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForPageStabilization();
  }

  async expectBatchToolsModalToAppear() {
    // Wait for the batch tools modal to appear by looking for the "Batch Tools" heading
    await expect(this.page.getByRole('heading', { name: 'Batch Tools' })).toBeVisible();
  }

  async expectDiffModalToAppear() {
    // Wait for the diff modal to appear - look for diff view elements
    await expect(this.page.locator('.monaco-diff-editor')).toBeVisible();
  }

  async closeDiffModal() {
    // Close the diff modal by clicking the close button (X)
    const closeButton = this.page.locator('button[title="Close and Save Changes"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    
    // Wait for the modal to fully close and split view to stabilize
    await expect(this.page.locator('.monaco-diff-editor')).toBeHidden();
    await this.waitForPageStabilization();
  }

  async expectSplitViewMode() {
    // Check if we're in split view mode by looking for the right panel
    await expect(this.page.locator('[data-editor-pane-side="right"]')).toBeVisible();
    
    // Debug: List all tabs globally on the page
    const allTabs = this.page.locator('[data-testid^="tab-"]');
    const totalTabCount = await allTabs.count();
    for (let i = 0; i < totalTabCount; i++) {
      const tabId = await allTabs.nth(i).getAttribute('data-testid');
      const tabText = await allTabs.nth(i).textContent();
    }
  }

  async expectLeftPanelContainsTab(tabTitle: string) {
    // Check if the left panel contains the specified tab
    const leftPanel = this.page.locator('[data-editor-pane-side="left"]');
    await expect(leftPanel).toBeVisible();
    
    // Debug: List all tabs in the left panel
    const allLeftTabs = leftPanel.locator('[data-testid^="tab-"]');
    const leftTabCount = await allLeftTabs.count();
    for (let i = 0; i < leftTabCount; i++) {
      const tabId = await allLeftTabs.nth(i).getAttribute('data-testid');
    }
    
    const tab = leftPanel.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
  }

  async expectRightPanelContainsTab(tabTitle: string) {
    // Check if the right panel contains the specified tab
    const rightPanel = this.page.locator('[data-editor-pane-side="right"]');
    await expect(rightPanel).toBeVisible();
    
    // Debug: List all tabs in the right panel
    const allRightTabs = rightPanel.locator('[data-testid^="tab-"]');
    const rightTabCount = await allRightTabs.count();
    for (let i = 0; i < rightTabCount; i++) {
      const tabId = await allRightTabs.nth(i).getAttribute('data-testid');
    }
    
    const tab = rightPanel.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
  }

  async expectTabContentContains(tabTitle: string, expectedContent: string) {
    // Click on the tab first to make it active, then check its content
    await this.page.locator(`[data-testid="tab-${tabTitle}"]`).click();
    // Wait for editor to be visible and check content
    const editor = this.page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    const content = await editor.textContent();
    expect(content).toContain(expectedContent);
  }

  async expectTabExistsOnPage(tabTitle: string) {
    // Check if the tab exists anywhere on the page
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
  }

  async expectTabActiveOnLeftSide(tabTitle: string) {
    // Check if the specified tab is active in the left panel
    const leftPanel = this.page.locator('[data-editor-pane-side="left"]');
    await expect(leftPanel).toBeVisible();
    
    // First check if the tab exists in the left panel
    const tab = leftPanel.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    
    // Then check if it's active
    const activeTab = leftPanel.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
    await expect(activeTab).toBeVisible();
  }

  async expectTabExistsOnRightSide(tabTitle: string) {
    // Check if the specified tab exists in the right panel
    const rightPanel = this.page.locator('[data-editor-pane-side="right"]');
    await expect(rightPanel).toBeVisible();
    
    const tab = rightPanel.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
  }

  async expectDiffModalComparison(tab1: string, tab2: string) {
    // Verify the diff modal is comparing the correct tabs
    const diffModal = this.page.locator('[data-testid="diff-modal"]');
    await expect(diffModal).toBeVisible();
    
    // Check for the h2 element with the title attribute that shows which tabs are being compared
    const comparisonTitle = diffModal.locator(`h2[title="${tab1} ↔ ${tab2}"]`);
    await expect(comparisonTitle).toBeVisible();
    
    // Also verify the Monaco diff editor is present and functional
    const diffContainer = this.page.locator('.monaco-diff-editor');
    await expect(diffContainer).toBeVisible();
  }

  async expectDiffModalLeftSideContains(content: string) {
    // Check that the left side of the diff modal contains the specified content
    const diffContainer = this.page.locator('[data-testid="diff-editor-container"]');
    await expect(diffContainer).toBeVisible();
    
    // Monaco diff editor renders the original (left) content first
    // Use a more reliable selector for the left side
    const leftSideEditor = diffContainer.locator('.editor.original, .monaco-editor').first();
    await expect(leftSideEditor).toBeVisible();
    
    const leftContent = await leftSideEditor.textContent();
    expect(leftContent).toContain(content);
  }

  async expectDiffModalRightSideContains(content: string) {
    // Check that the right side of the diff modal contains the specified content
    const diffContainer = this.page.locator('[data-testid="diff-editor-container"]');
    await expect(diffContainer).toBeVisible();
    
    // Monaco diff editor renders the modified (right) content second
    // Use a more reliable selector for the right side
    const rightSideEditor = diffContainer.locator('.editor.modified, .monaco-editor').last();
    await expect(rightSideEditor).toBeVisible();
    
    const rightContent = await rightSideEditor.textContent();
    expect(rightContent).toContain(content);
  }

  async expectDiffModalContains(content: string, side: 'left' | 'right') {
    // Check that the diff modal contains the specified content on the specified side
    const editorSelector = side === 'left' ? '.editor.original' : '.editor.modified';
    const editor = this.page.locator(editorSelector);
    await expect(editor).toBeVisible();
    
    const actualContent = await editor.innerText();
    // Remove line numbers (first line starting with digits) and normalize whitespace
    const contentWithoutLineNumbers = actualContent
      .replace(/^\d+\n/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const normalizedExpected = content
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`Comparing: expected="${normalizedExpected}" actual="${contentWithoutLineNumbers}"`);
    expect(contentWithoutLineNumbers).toContain(normalizedExpected);
  }
} 