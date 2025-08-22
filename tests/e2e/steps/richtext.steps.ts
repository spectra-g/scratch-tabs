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