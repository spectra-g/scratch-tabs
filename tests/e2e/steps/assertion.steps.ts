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