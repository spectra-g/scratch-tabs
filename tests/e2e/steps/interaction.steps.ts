const { When } = require('@cucumber/cucumber');

// Aliases for quoted and unquoted variants
When('I click the icon for {string}', async function(iconTestId) {
  await this.clickIcon(iconTestId);
});
When('I click the icon for "{string}"', async function(iconTestId) {
  await this.clickIcon(iconTestId);
});

When('I set clipboard content to {string}', async function(content) {
  await this.setClipboardContent(content);
});
When('I set clipboard content to "{string}"', async function(content) {
  await this.setClipboardContent(content);
});

When('I select {string} from the tablet selector', async function(tabletName) {
  await this.selectTablet(tabletName);
});
When('I select "{string}" from the tablet selector', async function(tabletName) {
  await this.selectTablet(tabletName);
});

When('I upload file {string} with content {string}', async function(filename, content) {
  await this.uploadFile(filename, content);
});
When('I upload file "{string}" with content "{string}"', async function(filename, content) {
  await this.uploadFile(filename, content);
});

When('I drag file {string} with content {string} onto the page', async function(filename, content) {
  await this.dragFileOntoPage(filename, content);
});
When('I drag file "{string}" with content {string} onto the page', async function(filename, content) {
  await this.dragFileOntoPage(filename, content);
});

When('I click the {string} tab', async function(tabTitle) {
  await this.clickTab(tabTitle);
});
When('I click the "{string}" tab', async function(tabTitle) {
  await this.clickTab(tabTitle);
});

// Existing specific steps
When('I click the "{string}" button', async function(buttonText) {
  await this.clickButton(buttonText);
});
When('I click the "{string}" link', async function(linkText) {
  await this.clickLink(linkText);
});
When('I click the tab titled "{string}"', async function(tabTitle) {
  await this.clickTab(tabTitle);
});
When('I type the following content into the active editor:', async function(content) {
  await this.typeInEditor(content);
});
When('I right-click in the editor', async function() {
  await this.rightClickEditor();
});
When('I double-click in the editor', async function() {
  await this.doubleClickEditor();
});
When('I select "{string}" from the context menu', async function(optionText) {
  await this.selectContextMenuOption(optionText);
});
When('I wait for the page to stabilize', async function() {
  await this.waitForPageStabilization();
});
When('I double-click on the page', async function() {
  await this.doubleClickOnPage();
});
When('I click the "Open specialized tablet" button', async function() {
  await this.clickOpenSpecializedTablet();
});
When('I click the "Import from clipboard" button', async function() {
  await this.clickImportFromClipboard();
});

When('I generate a 1.5MB JSON file and set it to clipboard', async function() {
  await this.generateLargeJsonFile();
});

When('I type the following markdown content into the editor:', async function(content) {
  await this.typeMarkdownContent(content);
});

When('I type {string} into the editor', async function(text) {
  await this.typeText(text);
});

When('I wait for {int} second', async function(seconds) {
  await this.waitForSeconds(seconds);
});

When('I wait for {int} seconds', async function(seconds) {
  await this.waitForSeconds(seconds);
});

When('I press Ctrl+Z', async function() {
  await this.pressCtrlZ();
}); 