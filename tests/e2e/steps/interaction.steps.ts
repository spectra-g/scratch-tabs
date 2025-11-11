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

When('I click the icon for {string} on the {string} side', async function(iconTestId, side) {
  await this.navigation.clickIcon(iconTestId, side);
});
When('I click the icon for "{string}" on the "{string}" side', async function(iconTestId, side) {
  await this.navigation.clickIcon(iconTestId, side);
});

When('I set clipboard content to {string}', async function(content) {
  await this.clipboard.setClipboardContent(content);
});
When('I set clipboard content to "{string}"', async function(content) {
  await this.clipboard.setClipboardContent(content);
});

When('I set clipboard content to:', async function(content) {
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
  await this.editor.typeInEditor(content);
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
  // Set up download capture for download actions
  if (menuItem === "Download") {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I select "{string}" from the context menu', async function(menuItem) {
  // Set up download capture for download actions
  if (menuItem === "Download") {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I click {string} in the download modal', async function(buttonText) {
  if (buttonText === "Select All") {
    await this.download.clickSelectAllInModal();
  } else if (buttonText.includes("Download")) {
    await this.download.clickDownloadFilesInModal(buttonText);
  } else {
    // Generic button click in modal
    const button = this.page.getByRole('button', { name: buttonText });
    await button.click();
  }
});

When('I click "{string}" in the download modal', async function(buttonText) {
  if (buttonText === "Select All") {
    await this.download.clickSelectAllInModal();
  } else if (buttonText.includes("Download")) {
    await this.download.clickDownloadFilesInModal(buttonText);
  } else {
    // Generic button click in modal
    const button = this.page.getByRole('button', { name: buttonText });
    await button.click();
  }
});

When('I click {string} in the confirmation dialog', async function(buttonText) {
  await this.confirmationDialog.clickConfirmationButton(buttonText);
});

When('I click "{string}" in the confirmation dialog', async function(buttonText) {
  await this.confirmationDialog.clickConfirmationButton(buttonText);
});

When('I pin the {string} tab', async function(tabTitle) {
  // Right-click the tab and select "Pin tab"
  await this.tabBar.rightClickTab(tabTitle);
  await this.contextMenu.selectFromContextMenu("Pin tab");
});

When('I pin the "{string}" tab', async function(tabTitle) {
  // Right-click the tab and select "Pin tab"
  await this.tabBar.rightClickTab(tabTitle);
  await this.contextMenu.selectFromContextMenu("Pin tab");
});

When('I select {string} from the {string} submenu', async function(subItem, parentItem) {
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I select "{string}" from the "{string}" submenu', async function(subItem, parentItem) {
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I click the Smart View button', async function() {
  await this.tabBar.clickSmartViewButton();
});

When('I click in the editor', async function() {
  await this.editor.clickInEditor();
});

When('I type {string} in the rename input', async function(text) {
  await this.tabBar.typeInRenameInput(text);
});

When('I press Enter to confirm rename', async function() {
  await this.tabBar.pressEnterToConfirmRename();
});

When('I double-click on the active tab', async function() {
  await this.tabBar.doubleClickActiveTab();
});

When('I close the diff modal', async function() {
  await this.navigation.closeDiffModal();
});

When('I click the {string} tab on the right side', async function(tabTitle) {
  await this.tabBar.clickTabOnRightSide(tabTitle);
});
When('I click the "{string}" tab on the right side', async function(tabTitle) {
  await this.tabBar.clickTabOnRightSide(tabTitle);
});

When('I type {string} into the left editor', async function(text) {
  await this.editor.typeText(text, 'left');
});

When('I type "{string}" into the left editor', async function(text) {
  await this.editor.typeText(text, 'left');
});

When('I type {string} into the right editor', async function(text) {
  await this.editor.typeText(text, 'right');
});

When('I type "{string}" into the right editor', async function(text) {
  await this.editor.typeText(text, 'right');
});

// Format popup search functionality
When('I click on the format selector in the status bar', async function() {
  await this.statusBar.clickStatusBarLanguage();
});

When('I type {string} in the format search input', async function(searchText) {
  await this.statusBar.typeInFormatSearch(searchText);
});

When('I type "{string}" in the format search input', async function(searchText) {
  await this.statusBar.typeInFormatSearch(searchText);
});

When('I clear the format search input', async function() {
  await this.statusBar.clearFormatSearch();
});

When('I click on {string} in the search results', async function(formatName) {
  await this.statusBar.clickFormatOption(formatName);
});

When('I click on "{string}" in the search results', async function(formatName) {
  await this.statusBar.clickFormatOption(formatName);
});

// Tab close button interactions
When('I click the close button on the {string} tab', async function(tabTitle) {
  await this.tabBar.clickCloseButton(tabTitle);
});

When('I click the close button on the "{string}" tab', async function(tabTitle) {
  await this.tabBar.clickCloseButton(tabTitle);
});

When('I CTRL+click the close button on the {string} tab', async function(tabTitle) {
  await this.tabBar.ctrlClickCloseButton(tabTitle);
});

When('I CTRL+click the close button on the "{string}" tab', async function(tabTitle) {
  await this.tabBar.ctrlClickCloseButton(tabTitle);
});

When('I CMD+click the close button on the {string} tab', async function(tabTitle) {
  await this.tabBar.cmdClickCloseButton(tabTitle);
});

When('I CMD+click the close button on the "{string}" tab', async function(tabTitle) {
  await this.tabBar.cmdClickCloseButton(tabTitle);
});