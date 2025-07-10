const { Then } = require('@cucumber/cucumber');

// Aliases for quoted and unquoted variants
Then('the {string} tab should exist and not be active', async function(tabTitle) {
  await this.expectTabExistsAndNotActive(tabTitle);
});
Then('the "{string}" tab should exist and not be active', async function(tabTitle) {
  await this.expectTabExistsAndNotActive(tabTitle);
});

Then('the {string} tab should be active', async function(tabTitle) {
  await this.expectTabIsActive(tabTitle);
});
Then('the "{string}" tab should be active', async function(tabTitle) {
  await this.expectTabIsActive(tabTitle);
});

Then('the {string} tablet should be active', async function(tabletName) {
  await this.expectTabletIsActive(tabletName);
});
Then('the "{string}" tablet should be active', async function(tabletName) {
  await this.expectTabletIsActive(tabletName);
});

Then('the URL should contain {string}', async function(expectedUrlPart) {
  await this.expectUrlContains(expectedUrlPart);
});
Then('the URL should contain "{string}"', async function(expectedUrlPart) {
  await this.expectUrlContains(expectedUrlPart);
});

// Existing steps
Then('I should see the text "{string}" on the page', async function(text) {
  await this.expectTextToExist(text);
});
Then('the active editor content should be:', async function(expectedContent) {
  await this.expectEditorContentToEqual(expectedContent);
});
Then('the active editor content should contain "{string}"', async function(text) {
  await this.expectEditorContentToContain(text);
});
Then('the tab with title "{string}" should be active', async function(tabTitle) {
  await this.expectTabIsActive(tabTitle);
});
Then('the tab with title {string} should be active', async function(tabTitle) {
  await this.expectTabIsActive(tabTitle);
});
Then('the active editor should contain markdown content', async function() {
  await this.expectEditorContainsMarkdown();
});
Then('the preview should be visible', async function() {
  await this.expectPreviewIsVisible();
});

Then('the first 10 lines of the editor should contain JSON content', async function() {
  await this.expectFirst10LinesContainJson();
});

Then('the status bar language should be {string}', async function(language) {
  await this.expectStatusBarLanguage(language);
});

Then('the status bar should show a green validation tick', async function() {
  await this.expectStatusBarValidationTick();
});

Then('the active editor content should be {string}', async function(expectedContent) {
  await this.expectEditorContentToEqual(expectedContent);
});

Then('the editor content should be on a single line', async function() {
  await this.expectContentIsSingleLine();
});

Then('the editor content should not be on a single line', async function() {
  await this.expectContentIsNotSingleLine();
}); 