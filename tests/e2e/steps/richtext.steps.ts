import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Shared mapping for toolbar button names to test IDs
const TOOLBAR_BUTTON_TEST_IDS: { [key: string]: string } = {
  'Bold': 'rich-text-bold',
  'Italic': 'rich-text-italic',
  'Inline Code': 'rich-text-code',
  'Code Block': 'rich-text-code-block',
  'Bullet List': 'rich-text-bullet-list',
  'Numbered List': 'rich-text-ordered-list',
  'Quote': 'rich-text-blockquote',
  'Insert Table': 'rich-text-table',
  'Add Link': 'rich-text-link',
  'Import Code': 'rich-text-import-code',
  'Background': 'rich-text-background'
};

/**
 * Helper function to click a toolbar button by name
 */
async function clickToolbarButton(page: any, buttonName: string) {
  const testId = TOOLBAR_BUTTON_TEST_IDS[buttonName];
  if (!testId) {
    throw new Error(`Unknown toolbar button: ${buttonName}`);
  }
  
  const button = page.locator(`[data-testid="${testId}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

// Given steps
Given('I am on a plain text editor tab', async function() {
  // Wait for the editor to be ready
  await this.editor.expectMonacoEditorVisible();
  
  // Verify we're not in rich text mode by checking the toggle shows "Text"
  await this.statusBar.expectRichTextToggleText('Text');
});

// When steps
When('I click the Rich Text toggle in the status bar', async function() {
  await this.statusBar.clickRichTextToggle();
});

When('I type {string} in the Rich Text editor', async function(text: string) {
  await this.editor.typeInRichTextEditor(text);
});

When('I split the tab to create a side-by-side view', async function() {
  // Right-click on the "Scratch 2" tab (which should be active after creating a new tab) to open context menu
  await this.tabBar.rightClickTab('Scratch 2');
  // Select "Split" from the context menu  
  await this.contextMenu.selectFromContextMenu('Split');
});

When('I click the Rich Text toggle in the right side status bar', async function() {
  await this.statusBar.clickRichTextToggle('right');
});

When('I type {string} in the right side Rich Text editor', async function(text: string) {
  await this.editor.typeInRichTextEditor(text, 'right');
});

When('I type {string} in the Monaco editor', async function(text: string) {
  await this.editor.typeInEditor(text);
});

// Then steps
Then('I should see the Rich Text editor is displayed', async function() {
  await this.editor.expectRichTextEditorVisible();
});

Then('I should see the date created text with {string} time', async function(timeReference: string) {
  await this.editor.expectRichTextDateCreatedVisible();
  
  if (timeReference.toLowerCase() === 'now') {
    // Get current date parts
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
    const currentDay = now.getDate().toString();
    
    // Check that the date created contains current year, month, and day
    await this.editor.expectRichTextDateCreatedContainsText('Created');
    await this.editor.expectRichTextDateCreatedContainsText(currentYear);
    await this.editor.expectRichTextDateCreatedContainsText(currentMonth);
    await this.editor.expectRichTextDateCreatedContainsText(currentDay);
  }
});

Then('the Rich Text editor should contain the text {string}', async function(expectedText: string) {
  await this.editor.expectRichTextEditorContainsText(expectedText);
});

Then('I should see at least one paragraph in the Rich Text editor', async function() {
  // Verify that at least one paragraph exists in the editor (indicating text input is working)
  const paragraphs = this.page.locator('[data-editor-pane-side="left"] .ProseMirror p');
  await expect(paragraphs.first()).toBeVisible();
});

Then('the Rich Text toggle should show {string} text', async function(toggleText: string) {
  await this.statusBar.expectRichTextToggleText(toggleText as 'Rich' | 'Text');
});

Then('the left side Rich Text editor should contain {string}', async function(text: string) {
  await this.editor.expectRichTextEditorContainsText(text, 'left');
});

Then('the right side Rich Text editor should contain {string}', async function(text: string) {
  await this.editor.expectRichTextEditorContainsText(text, 'right');
});

Then('the left side Rich Text editor should not contain {string}', async function(text: string) {
  await this.editor.expectRichTextEditorDoesNotContainText(text, 'left');
});

Then('the right side Rich Text editor should not contain {string}', async function(text: string) {
  await this.editor.expectRichTextEditorDoesNotContainText(text, 'right');
});

Then('I should see the Monaco editor is displayed', async function() {
  await this.editor.expectMonacoEditorVisible();
});

Then('the Monaco editor should contain {string}', async function(expectedText: string) {
  await this.editor.expectEditorContentToContain(expectedText);
});

// New steps for image paste scenario
When('I set clipboard content to contain an image', async function() {
  // Create a simple base64-encoded 1x1 transparent PNG image for testing
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  // Set the clipboard to contain image data using the browser's clipboard API
  await this.page.evaluate(async (imageData) => {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    // Create clipboard item with the image
    const clipboardItem = new ClipboardItem({
      'image/png': blob
    });
    
    // Write to clipboard
    await navigator.clipboard.write([clipboardItem]);
  }, base64Image);
});

When('I paste into the editor', async function() {
  // Focus the Monaco editor
  const editor = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
  await editor.focus();
  
  // Simulate a paste event using the actual clipboard content (generic for any content type)
  await this.page.evaluate(async () => {
    // Read from the actual clipboard that was set in previous step
    const clipboardItems = await navigator.clipboard.read();
    
    // Create a DataTransfer with the clipboard data
    const dataTransfer = new DataTransfer();
    
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          // Handle image content
          const blob = await clipboardItem.getType(type);
          const file = new File([blob], 'clipboard-image.png', { type });
          dataTransfer.items.add(file);
        } else if (type === 'text/plain') {
          // Handle text content
          const textBlob = await clipboardItem.getType(type);
          const text = await textBlob.text();
          dataTransfer.items.add(text, type);
        } else if (type.startsWith('text/')) {
          // Handle other text types (html, rtf, etc.)
          const contentBlob = await clipboardItem.getType(type);
          const content = await contentBlob.text();
          dataTransfer.items.add(content, type);
        }
        // Add more content types as needed in the future
      }
    }
    
    // Find the Monaco editor container using stable data-testid
    const editorContainer = document.querySelector('[data-editor-pane-side="left"] [data-testid="monaco-editor-container"]');
    if (editorContainer) {
      // Create and dispatch paste event with actual clipboard data
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });
      
      editorContainer.dispatchEvent(pasteEvent);
    }
  });
});

Then('I should see the rich text conversion modal with {string} title', async function(expectedTitle: string) {
  // Wait for the modal to appear using stable data-testid
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal).toBeVisible();
  
  // Check for the title
  await expect(this.page.getByText(expectedTitle)).toBeVisible();
});

Then('the modal should contain {string}', async function(expectedText: string) {
  // Check that the expected text appears in the modal
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal.getByText(expectedText)).toBeVisible();
});

When('I click {string} in the modal', async function(buttonText: string) {
  // Click the specific button in the modal
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  const button = modal.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
});

Then('the modal should be dismissed', async function() {
  // Wait for the modal to close
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal).not.toBeVisible();
});

Then('the Rich Text editor should contain an image', async function() {
  // Look for an image element in the ProseMirror editor (exclude ProseMirror separator)
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const image = tipTapEditor.locator('img:not(.ProseMirror-separator)');
  await expect(image).toBeVisible();
  
  // Verify it has a src attribute (data URL or blob URL)
  const src = await image.getAttribute('src');
  expect(src).toBeTruthy();
  expect(src?.length).toBeGreaterThan(0);
});

// Rich text toolbar step definitions
When('I select the text {string}', async function(text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  
  // Use JavaScript to select text in the editor
  await this.page.evaluate((textToSelect) => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    if (!editor) return;
    
    // Find all text nodes and their ranges
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Find the text we want to select
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const index = nodeText.indexOf(textToSelect);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + textToSelect.length);
        
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }
      }
    }
  }, text);
});

When('I click the {string} button in the Rich Text toolbar', async function(buttonName: string) {
  await clickToolbarButton(this.page, buttonName);
});

Then('the selected text should be bold in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const boldText = tipTapEditor.locator('strong');
  await expect(boldText).toBeVisible();
});

Then('the selected text should be italic in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const italicText = tipTapEditor.locator('em');
  await expect(italicText).toBeVisible();
});

Then('the selected text should be inline code in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeText = tipTapEditor.locator('code');
  await expect(codeText).toBeVisible();
});

Then('I should see a bullet list in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const bulletList = tipTapEditor.locator('ul');
  await expect(bulletList).toBeVisible();
});

When('I press Enter and type {string}', async function(text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
  await tipTapEditor.type(text);
});

When('I press Enter twice', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
  await tipTapEditor.press('Enter');
});

When('I press Enter and click the {string} button in the Rich Text toolbar', async function(buttonName: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
  
  // Then click the toolbar button using the helper function
  await clickToolbarButton(this.page, buttonName);
});

When('I type {string}', async function(text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.type(text);
});

Then('I should see {string} as the next bullet point', async function(text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const listItems = tipTapEditor.locator('ul li');
  await expect(listItems.nth(1)).toContainText(text);
});

Then('I should see a numbered list in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const numberedList = tipTapEditor.locator('ol');
  await expect(numberedList).toBeVisible();
});

Then('I should see a blockquote in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const blockquote = tipTapEditor.locator('blockquote');
  await expect(blockquote).toBeVisible();
});

When('I type {string} in the code block', async function(code: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre code');
  await codeBlock.type(code);
});

Then('I should see a code block in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre');
  await expect(codeBlock).toBeVisible();
});

When('I click after the code block', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre');
  
  // Click at the end of the editor
  await tipTapEditor.press('End');
  await tipTapEditor.press('Enter');
});

Then('I should see a table with 3 rows and 3 columns in the Rich Text editor', async function() {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const table = tipTapEditor.locator('table');
  await expect(table).toBeVisible();
  
  // Check for 3 rows
  const rows = tipTapEditor.locator('table tr');
  await expect(rows).toHaveCount(3);
  
  // Check for 3 columns in the first row
  const firstRowCells = tipTapEditor.locator('table tr:first-child th, table tr:first-child td');
  await expect(firstRowCells).toHaveCount(3);
});

Then('the background texture should change', async function() {
  // Check that the rich text editor container has a background style
  const richTextEditor = this.page.locator('[data-editor-pane-side="left"] .rich-text-editor');
  
  // The background texture is applied via CSS, so we check for style changes
  const hasBackgroundStyle = await richTextEditor.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none';
  });
  
  expect(hasBackgroundStyle).toBe(true);
});