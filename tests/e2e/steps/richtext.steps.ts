import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

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