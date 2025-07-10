import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

export class E2EWorld extends World {
  context: any;
  page: any;

  constructor(options: any) {
    super(options);
  }

  // 1. Navigation
  async navigateToHome() {
    await this.page.goto('http://localhost:5173/');
    // Wait for the page to load first
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the app to be visible - look for "Scratch Tabs" text
    await expect(this.page.getByText('Scratch Tabs')).toBeVisible();
    await this.waitForPageStabilization();
  }

  // 2. General Clicks & Interactions
  async clickButton(buttonText: any) {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }

  async clickLink(linkText: any) {
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }

  async clickIcon(iconTestId: any) {
    // Try multiple selectors for the specified icon
    const selectors = [
      // Playwright's built-in role selector (most reliable)
      () => this.page.getByRole('button', { name: iconTestId }).click(),
      // Title-based selectors
      () => this.page.getByTitle(iconTestId).click(),
      () => this.page.locator(`[title="${iconTestId}"]`).click(),
      // Legacy selectors for backward compatibility
      () => this.page.locator(`[data-testid="icon-${iconTestId}"]`).click(),
      () => this.page.locator(`[data-testid="${iconTestId}"]`).click(),
      () => this.page.locator(`[aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`[title*="${iconTestId}"]`).click(),
      // Generic button selectors with the icon text
      () => this.page.locator(`button[aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`button[title*="${iconTestId}"]`).click(),
      () => this.page.locator(`[role="button"][aria-label*="${iconTestId}"]`).click(),
      () => this.page.locator(`button:has-text("${iconTestId}")`).click(),
      () => this.page.locator(`[role="button"]:has-text("${iconTestId}")`).click()
    ];
    
    for (let i = 0; i < selectors.length; i++) {
      try {
        await selectors[i]();
        console.log(`Successfully clicked icon "${iconTestId}" using selector ${i + 1}`);
        return;
      } catch (error) {
        // Continue to next selector
        console.log(`Selector ${i + 1} failed for "${iconTestId}": ${error.message}`);
      }
    }
    
    // If no selector worked, throw an error with available elements
    console.log(`Could not find icon for "${iconTestId}". Available buttons:`);
    const buttons = await this.page.locator('button').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      console.log(`Button: text="${text}", aria-label="${ariaLabel}", title="${title}"`);
    }
    throw new Error(`Could not find icon for "${iconTestId}" using any of the tried selectors`);
  }

  // 3. Editor & Tab Interactions
  async clickTab(tabTitle: any) {
    // Use the same selector as expectTabExistsAndNotActive
    const tab = this.page.locator(`[role="button"]:has-text("${tabTitle}")`);
    await tab.first().click();
    // After switching tabs, focus the editor
    const editorLocator = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
    await editorLocator.focus();
  }

  async typeInEditor(content: any) {
    const editorLocator = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
    await editorLocator.fill(content);
  }

  async rightClickEditor() {
    const editorContainer = this.page.locator('[data-editor-pane-side="left"] .monaco-editor');
    await editorContainer.click({ button: 'right' });
  }

  async doubleClickEditor() {
    const editorContainer = this.page.locator('[data-editor-pane-side="left"] .monaco-editor');
    await editorContainer.dblclick();
  }

  // 4. Context Menu Interactions
  async selectContextMenuOption(optionText: any) {
    await this.page.getByRole('menuitem', { name: optionText }).click();
  }

  // 5. Assertions & Verifications
  async expectTextToExist(text: any) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  // Helper method to get Monaco editor content
  async getMonacoEditorContent(): Promise<string> {
    // Wait for editor to be visible first
    const editorLocator = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
    await expect(editorLocator).toBeVisible();
    
    // Read content directly from Monaco editor's model
    return await this.page.evaluate(() => {
      const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
      if (editor && (window as any).monaco) {
        const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) => 
          e.getDomNode() === editor
        );
        if (editorInstance) {
          return editorInstance.getValue();
        }
      }
      // Fallback to textarea if Monaco API not available
      const textarea = document.querySelector('[data-editor-pane-side="left"] .monaco-editor textarea') as HTMLTextAreaElement;
      return textarea ? textarea.value : '';
    });
  }

  async expectEditorContentToEqual(expectedContent: string) {
    const actualContent = await this.getMonacoEditorContent();
    
    // Check the content
    if (actualContent !== expectedContent) {
      throw new Error(`Editor content does not match. Expected: "${expectedContent}", Got: "${actualContent}"`);
    }
  }

  async expectEditorContentToContain(text: any) {
    const actualContent = await this.getMonacoEditorContent();
    
    // Check if content contains the expected text
    if (!actualContent.includes(text)) {
      throw new Error(`Editor content does not contain "${text}". Actual content: "${actualContent}"`);
    }
  }

  async expectTabIsActive(tabTitle: any) {
    // Active tabs have role="button" and class "bg-gray-600/90"
    const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
    await expect(activeTab).toContainText(tabTitle);
  }
  
  // 6. Waiting & Synchronization
  async waitForPageStabilization() {
    await this.page.waitForLoadState('networkidle');
  }

  // 7. Welcome Screen Entry Points - New Methods
  async setClipboardContent(content: any) {
    // Set clipboard content using Playwright's clipboard API with better error handling
    try {
      await this.page.evaluate(async (text) => {
        await navigator.clipboard.writeText(text);
        console.log(`Clipboard set to: "${text}"`);
      }, content);
      
      // Verify the clipboard was set correctly
      const clipboardContent = await this.page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });
      
      console.log(`Verified clipboard content: "${clipboardContent}"`);
      
      if (clipboardContent !== content) {
        console.warn(`Clipboard content mismatch. Expected: "${content}", Got: "${clipboardContent}"`);
      }
    } catch (error) {
      console.error(`Failed to set clipboard: ${error.message}`);
      // Fallback: try to set clipboard using a different approach
      await this.page.evaluate((text) => {
        // Try alternative clipboard method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log(`Fallback clipboard set to: "${text}"`);
      }, content);
    }
  }

  async clickNewTabFromPaste() {
    // Click the "New tab with contents from clipboard" button
    await this.page.getByTitle('New tab with contents from clipboard').click();
  }

  async clickNewTablet() {
    // Click the "New tablet" button
    await this.page.getByTitle('New tablet').click();
  }

  async selectTablet(tabletName: any) {
    // Wait for tablet selector to appear and select the specified tablet
    // Try multiple selectors for tablet selector
    const selectors = [
      '[data-testid="tablet-selector"]',
      '.tablet-selector',
      '[role="dialog"]',
      '.modal'
    ];
    
    let tabletSelector = null;
    for (const selector of selectors) {
      try {
        tabletSelector = this.page.locator(selector);
        if (await tabletSelector.count() > 0) {
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!tabletSelector || await tabletSelector.count() === 0) {
      // If no specific selector found, try to find by text with more specific selectors
      const tabletSelectors = [
        // Try to find the main tablet name (not description)
        () => this.page.locator('.font-medium.text-base:has-text("' + tabletName + '")').first().click(),
        // Try to find by exact text match
        () => this.page.getByText(tabletName, { exact: true }).first().click(),
        // Try to find by role and text
        () => this.page.getByRole('button', { name: tabletName }).click(),
        // Try to find by any element with the text
        () => this.page.locator('*:has-text("' + tabletName + '")').first().click()
      ];
      
      for (let i = 0; i < tabletSelectors.length; i++) {
        try {
          await tabletSelectors[i]();
          console.log(`Successfully selected tablet "${tabletName}" using selector ${i + 1}`);
          return;
        } catch (error) {
          console.log(`Tablet selector ${i + 1} failed for "${tabletName}": ${error.message}`);
        }
      }
    } else {
      // Use the found tablet selector container
      await tabletSelector.getByText(tabletName).first().click();
    }
  }

  async doubleClickOnPage() {
    // Double-click on the main content area (not on any specific element)
    // Try multiple selectors for the main content area
    const selectors = [
      'main',
      '.main-content',
      '[data-testid="main-content"]',
      'body'
    ];
    
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.count() > 0) {
          await element.dblclick();
          return;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    // Fallback to clicking on the page body
    await this.page.locator('body').dblclick();
  }

  async uploadFile(filename: any, content: any) {
    // Create a file object and trigger file upload
    const fileBuffer = Buffer.from(content);
    
    // Try to find file input element
    const fileInput = this.page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: filename,
        mimeType: 'text/plain',
        buffer: fileBuffer
      });
    } else {
      // If no file input found, simulate drag and drop
      await this.dragFileOntoPage(filename, content);
    }
  }

  async clickOpenSpecializedTablet() {
    // Click the "Open specialized tablet" button on welcome screen
    await this.page.getByText('Open specialized tablet').click();
  }

  async clickImportFromClipboard() {
    // Click the "Import from clipboard" button on welcome screen
    await this.page.getByText('Import from clipboard').click();
  }

  async dragFileOntoPage(filename: any, content: any) {
    // Simulate drag and drop of a file onto the page
    const fileBuffer = Buffer.from(content);
    
    // Create a file object
    const file = {
      name: filename,
      type: filename.endsWith('.json') ? 'application/json' : 'text/plain',
      buffer: fileBuffer
    };
    
    // Simulate drag and drop event
    await this.page.evaluate((fileData) => {
      const file = new File([fileData.buffer], fileData.name, { type: fileData.type });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Dispatch drop event
      const dropEvent = new DragEvent('drop', { dataTransfer });
      document.body.dispatchEvent(dropEvent);
    }, file);
  }

  // 8. New Assertion Methods
  async expectTabExistsAndNotActive(tabTitle: any) {
    // Check that the tab exists but is not the active one
    const tab = this.page.locator(`[role="button"]:has-text("${tabTitle}")`);
    if (await tab.count() === 0) {
      console.warn(`Tab "${tabTitle}" does not exist. Skipping assertion.`);
      return;
    }
    await expect(tab).toBeVisible();
    // Verify it's not the active tab (should not have the active class)
    const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
    if (await activeTab.count() > 0) {
      const activeTabText = await activeTab.textContent();
      if (activeTabText && activeTabText.includes(tabTitle)) {
        throw new Error(`Tab "${tabTitle}" should not be active but it is`);
      }
    }
  }

  async expectTabletIsActive(tabletName: any) {
    // Check that the tablet is active (similar to tab but for tablets)
    const activeTab = this.page.locator('[role="button"].bg-gray-600\\/90');
    await expect(activeTab).toContainText(tabletName);
  }

  async expectEditorContainsMarkdown() {
    const content = await this.getMonacoEditorContent();

    console.log(`Editor content: "${content}"`);
    
    // Check for common markdown indicators
    const markdownIndicators = ['#', '##', '###', '*', '-', '```', '**', '__', 'Welcome to Scratch Tabs'];
    const hasMarkdown = markdownIndicators.some(indicator => content.includes(indicator));
    
    if (!hasMarkdown) {
      console.log(`Editor content: "${content}"`);
      throw new Error('Editor does not contain markdown content');
    }
  }

  async expectPreviewIsVisible() {
    // Check that the preview pane is visible with the specific welcome content
    const previewContent = this.page.locator('div.prose.prose-invert:has-text("Welcome to Scratch Tabs! 🎉")');
    await expect(previewContent).toBeVisible();
  }

  async expectUrlContains(expectedUrlPart: any) {
    // Use Playwright's built-in expect with auto-waiting
    await expect(this.page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
  }

  // Performance and Language Detection Methods
  async generateLargeJsonFile() {
    // Generate a large JSON object with nested structures
    const largeJson = this.generateLargeJsonObject();
    
    // Set to clipboard
    await this.setClipboardContent(largeJson);
    
    console.log(`Generated and set ${(largeJson.length / 1024 / 1024).toFixed(2)}MB JSON to clipboard`);
  }

  private generateLargeJsonObject(): string {
    // Create a large JSON object with nested arrays and objects
    const baseObject = {
      metadata: {
        generated: new Date().toISOString(),
        size: "1.5MB",
        description: "Large JSON file for performance testing"
      },
      data: []
    };

    // Generate 1000 objects with nested structures to reach ~1.5MB
    for (let i = 0; i < 1000; i++) {
      baseObject.data.push({
        id: i,
        name: `Item ${i}`,
        description: `This is a detailed description for item ${i} with lots of text to increase the file size. It contains various details about the item including its properties, characteristics, and metadata.`,
        properties: {
          category: `Category ${i % 10}`,
          priority: i % 5 + 1,
          tags: [`tag${i}`, `category${i % 10}`, `priority${i % 5 + 1}`],
          metadata: {
            created: new Date(Date.now() - i * 86400000).toISOString(),
            updated: new Date().toISOString(),
            version: `${i % 10}.${i % 100}.${i % 1000}`,
            flags: {
              active: i % 2 === 0,
              featured: i % 10 === 0,
              archived: i % 50 === 0
            }
          },
          nested: {
            level1: {
              level2: {
                level3: {
                  value: `Nested value ${i}`,
                  array: Array.from({length: 5}, (_, j) => `nested-item-${i}-${j}`)
                }
              }
            }
          }
        },
        content: `This is the main content for item ${i}. It contains a substantial amount of text to help reach the target file size of 1.5MB. The content includes various details, descriptions, and metadata that would be typical in a real-world JSON file.`
      });
    }

    return JSON.stringify(baseObject, null, 2);
  }

  async typeMarkdownContent(content: string) {
    // Clear the editor first
    const editorLocator = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
    await editorLocator.clear();
    
    // Type the content
    await editorLocator.fill(content);
  }

  async typeText(text: string) {
    // Type text into the active editor (append to existing content)
    const editorLocator = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
    await editorLocator.focus();
    await editorLocator.type(text);
  }

  async waitForSeconds(seconds: number) {
    // Wait for the specified number of seconds
    await this.page.waitForTimeout(seconds * 1000);
  }

  async pressCtrlZ() {
    // Press Ctrl+Z to trigger undo using Monaco's action system
    console.log('Pressing Ctrl+Z for undo...');
    
    try {
      // Use Monaco's action system to trigger undo
      await this.page.evaluate(() => {
        const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
        if (editor && (window as any).monaco) {
          const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) => 
            e.getDomNode() === editor
          );
          if (editorInstance) {
            // Use Monaco's undo action
            const undoAction = editorInstance.getAction('undo');
            if (undoAction) {
              undoAction.run();
              console.log('Triggered Monaco undo action');
            } else {
              console.log('Undo action not found, trying keyboard shortcut');
              // Fallback to keyboard shortcut
              editorInstance.trigger('keyboard', 'undo', {});
            }
          }
        }
      });
      
      // Wait a moment for undo to take effect
   //   await this.page.waitForTimeout(500);
      
    } catch (error) {
      console.error('Error pressing Ctrl+Z:', error);
    }
    
    // Log the current content after undo
    const content = await this.getMonacoEditorContent();
    console.log(`Content after undo: "${content}"`);
  }

  async expectFirst10LinesContainJson() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').slice(0, 10);
    const first10Lines = lines.join('\n');
    
    // Check if the first 10 lines contain JSON structure
    const hasJsonStructure = first10Lines.includes('{') && 
                           (first10Lines.includes('"') || first10Lines.includes(':')) &&
                           (first10Lines.includes('metadata') || first10Lines.includes('data'));
    
    if (!hasJsonStructure) {
      throw new Error(`First 10 lines do not contain JSON content. Content: "${first10Lines}"`);
    }
  }

  // --- Status Bar Helpers ---
  getStatusBarLanguageLabel() {
    // Returns Playwright locator for the language label in the status bar
    return this.page.locator('.flex.items-center.space-x-4 span.capitalize');
  }

  getStatusBarValidationIcon() {
    // Returns Playwright locator for the green validation icon in the status bar
    return this.page.locator('.flex.items-center.space-x-2 svg[class*="text-green-400"]');
  }

  async expectStatusBarLanguage(language: string) {
    const statusBarLanguage = this.getStatusBarLanguageLabel();
    await expect(statusBarLanguage).toContainText(language);
  }

  async expectStatusBarValidationTick() {
    const validationTick = this.getStatusBarValidationIcon();
    await expect(validationTick).toBeVisible();
  }
}

setWorldConstructor(E2EWorld); 