const { When } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
import { waitForSaveIndicator, waitForCursorIndicator } from '../support/testIndicator.utils';

// Updated to use action classes directly instead of delegate methods
// Aliases for quoted and unquoted variants
When('I click the icon for {string}', async function(iconTestId) {
  await this.navigation.clickIcon(iconTestId);
});
When('I click the icon for "{string}"', async function(iconTestId) {
  await this.navigation.clickIcon(iconTestId);
});

When('I set clipboard content to {string}', async function(content) {
  await this.clipboard.setClipboardContent(content);
});
When('I set clipboard content to "{string}"', async function(content) {
  await this.clipboard.setClipboardContent(content);
});

When('I select {string} from the tablet selector', async function(tabletName) {
  await this.tabBar.selectTablet(tabletName);
});
When('I select "{string}" from the tablet selector', async function(tabletName) {
  await this.tabBar.selectTablet(tabletName);
});

When('I upload file {string} with content {string}', async function(filename, content) {
  await this.file.uploadFile(filename, content);
});
When('I upload file "{string}" with content "{string}"', async function(filename, content) {
  await this.file.uploadFile(filename, content);
});

When('I drag file {string} with content {string} onto the page', async function(filename, content) {
  await this.file.dragFileOntoPage(filename, content);
});
When('I drag file "{string}" with content {string} onto the page', async function(filename, content) {
  await this.file.dragFileOntoPage(filename, content);
});

When('I click the {string} tab', async function(tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});
When('I click the "{string}" tab', async function(tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});

// Updated to use action classes directly instead of delegate methods
When('I click the "{string}" button', async function(buttonText) {
  await this.navigation.clickButton(buttonText);
});

When('I wait for the tablet to be ready', async function() {
  // Wait for any tablet loading to complete and DOM to stabilize
  await this.navigation.waitForPageStabilization();
});

When('I wait for the application to load', async function() {
  // Wait for the application to fully load after refresh
  await this.navigation.waitForPageStabilization();
});

When('I wait for the state to be saved', async function() {
  // Wait for the app's save operation to complete by observing DOM changes
  await waitForSaveIndicator(this.page);
});

When('I refresh the page', async function() {
  await this.navigation.refreshPage();
});

When('I click in the editor at line {int}', async function(lineNumber) {

  await this.editor.clickAtLine(lineNumber);
});

When('I wait for cursor position to stabilize', async function() {
  // Wait for cursor position changes to settle and be persisted
  await waitForCursorIndicator(this.page);
});

When('I click the "{string}" link', async function(linkText) {
  await this.navigation.clickLink(linkText);
});
When('I click the tab titled "{string}"', async function(tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});
When('I type the following content into the active editor:', async function(content) {
  await this.editor.typeInEditor(content);
});
When('I right-click in the editor', async function() {
  await this.editor.rightClickEditor();
});
When('I double-click in the editor', async function() {
  await this.editor.doubleClickEditor();
});
When('I select "{string}" from the context menu', async function(optionText) {
  await this.contextMenu.selectContextMenuOption(optionText);
});
When('I wait for the page to stabilize', async function() {
  await this.navigation.waitForPageStabilization();
});
When('I double-click on the page', async function() {
  await this.navigation.doubleClickOnPage();
});
When('I click the "Open specialized tablet" button', async function() {
  await this.tabBar.clickOpenSpecializedTablet();
});
When('I click the "Import from clipboard" button', async function() {
  await this.tabBar.clickImportFromClipboard();
});

When('I generate a 1.5MB JSON file and set it to clipboard', async function() {
  await this.file.generateLargeJsonFile();
});

When('I type the following markdown content into the editor:', async function(content) {
  await this.editor.typeMarkdownContent(content);
});

When('I type {string} into the editor', async function(text) {
  await this.editor.typeText(text);
});

When('I press Ctrl+Z', async function() {
  await this.editor.pressCtrlZ();
});

When('I right-click the {string} tab', async function(tabTitle) {
  await this.tabBar.rightClickTab(tabTitle);
});

When('I right-click the "{string}" tab', async function(tabTitle) {
  await this.tabBar.rightClickTab(tabTitle);
});

When('I select {string} from the context menu', async function(menuItem) {
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I select "{string}" from the context menu', async function(menuItem) {
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I select {string} from the {string} submenu', async function(subItem, parentItem) {
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I select "{string}" from the "{string}" submenu', async function(subItem, parentItem) {
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I click the three dots menu', async function() {
  await this.tabBar.clickThreeDotsMenu();
});

When('I click in the editor', async function() {
  await this.editor.clickInEditor();
});