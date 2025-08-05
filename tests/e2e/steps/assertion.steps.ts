const { Then } = require('@cucumber/cucumber');

// Updated to use action classes directly instead of delegate methods
// Aliases for quoted and unquoted variants
Then('the {string} tab should exist and not be active', async function(tabTitle) {
  await this.tabBar.expectTabExistsAndNotActive(tabTitle);
});
Then('the "{string}" tab should exist and not be active', async function(tabTitle) {
  await this.tabBar.expectTabExistsAndNotActive(tabTitle);
});

Then('the {string} tab should be active', async function(tabTitle) {
  await this.tabBar.expectTabIsActive(tabTitle);
});
Then('the "{string}" tab should be active', async function(tabTitle) {
  await this.tabBar.expectTabIsActive(tabTitle);
});

Then('the {string} tablet should be active', async function(tabletName) {
  await this.tabBar.expectTabletIsActive(tabletName);
});
Then('the "{string}" tablet should be active', async function(tabletName) {
  await this.tabBar.expectTabletIsActive(tabletName);
});

Then('the URL should contain {string}', async function(expectedUrlPart) {
  await this.navigation.expectUrlContains(expectedUrlPart);
});
Then('the URL should contain "{string}"', async function(expectedUrlPart) {
  await this.navigation.expectUrlContains(expectedUrlPart);
});

// Updated to use action classes directly instead of delegate methods
Then('I should see the text "{string}" on the page', async function(text) {
  await this.navigation.expectTextToExist(text);
});
Then('the active editor content should be:', async function(expectedContent) {
  await this.editor.expectEditorContentToEqual(expectedContent);
});
Then('the active editor content should contain "{string}"', async function(text) {
  await this.editor.expectEditorContentToContain(text);
});
Then('the active editor content should contain {string}', async function(text) {
  await this.editor.expectEditorContentToContain(text);
});

Then('the cursor should be at line {int}', async function(lineNumber) {
  await this.editor.expectCursorAtLine(lineNumber);
});
Then('the tab with title "{string}" should be active', async function(tabTitle) {
  await this.tabBar.expectTabIsActive(tabTitle);
});
Then('the tab with title {string} should be active', async function(tabTitle) {
  await this.tabBar.expectTabIsActive(tabTitle);
});
Then('the active editor should contain markdown content', async function() {
  await this.editor.expectEditorContainsMarkdown();
});
Then('the preview should be visible', async function() {
  await this.editor.expectPreviewIsVisible();
});

Then('the first 10 lines of the editor should contain JSON content', async function() {
  await this.editor.expectFirst10LinesContainJson();
});

Then('the status bar language should be {string}', async function(language) {
  await this.statusBar.expectStatusBarLanguage(language);
});

Then('the status bar should show a green validation tick', async function() {
  await this.statusBar.expectStatusBarValidationTick();
});

Then('the active editor content should be {string}', async function(expectedContent) {
  await this.editor.expectEditorContentToEqual(expectedContent);
});

Then('the editor content should be on a single line', async function() {
  await this.editor.expectContentIsSingleLine();
});

Then('the editor content should not be on a single line', async function() {
  await this.editor.expectContentIsNotSingleLine();
});

Then('each line should be valid JSON', async function() {
  await this.editor.expectEachLineIsValidJson();
});

Then('the batch tools modal should appear', async function() {
  await this.navigation.expectBatchToolsModalToAppear();
});

Then('the tab rename input should appear', async function() {
  await this.tabBar.expectTabRenameInputToAppear();
});

Then('the editor should be empty', async function() {
  await this.editor.expectEditorToBeEmpty();
});

Then('the "{string}" submenu should appear', async function(submenuName) {
  await this.contextMenu.expectSubmenuToAppear(submenuName);
});

Then('the diff modal should appear', async function() {
  await this.navigation.expectDiffModalToAppear();
});

Then('I should be in split view mode', async function() {
  await this.navigation.expectSplitViewMode();
});

Then('the left panel should contain the "{string}" tab', async function(tabTitle) {
  await this.navigation.expectLeftPanelContainsTab(tabTitle);
});
Then('the left panel should contain the {string} tab', async function(tabTitle) {
  await this.navigation.expectLeftPanelContainsTab(tabTitle);
});

Then('the right panel should contain the "{string}" tab', async function(tabTitle) {
  await this.navigation.expectRightPanelContainsTab(tabTitle);
});
Then('the right panel should contain the {string} tab', async function(tabTitle) {
  await this.navigation.expectRightPanelContainsTab(tabTitle);
});

Then('the "{string}" tab content should contain "{string}"', async function(tabTitle, expectedContent) {
  await this.navigation.expectTabContentContains(tabTitle, expectedContent);
});
Then('the {string} tab content should contain {string}', async function(tabTitle, expectedContent) {
  await this.navigation.expectTabContentContains(tabTitle, expectedContent);
});

Then('the "{string}" tab should exist on the page', async function(tabTitle) {
  await this.navigation.expectTabExistsOnPage(tabTitle);
});
Then('the {string} tab should exist on the page', async function(tabTitle) {
  await this.navigation.expectTabExistsOnPage(tabTitle);
});

Then('the {string} tab should be active on the left side', async function(tabTitle) {
  await this.navigation.expectTabActiveOnLeftSide(tabTitle);
});
Then('the "{string}" tab should be active on the left side', async function(tabTitle) {
  await this.navigation.expectTabActiveOnLeftSide(tabTitle);
});

Then('the {string} tab should exist on the right side', async function(tabTitle) {
  await this.navigation.expectTabExistsOnRightSide(tabTitle);
});
Then('the "{string}" tab should exist on the right side', async function(tabTitle) {
  await this.navigation.expectTabExistsOnRightSide(tabTitle);
});

Then('the diff modal should show comparison between {string} and {string}', async function(tab1, tab2) {
  await this.navigation.expectDiffModalComparison(tab1, tab2);
});
Then('the diff modal should show comparison between "{string}" and "{string}"', async function(tab1, tab2) {
  await this.navigation.expectDiffModalComparison(tab1, tab2);
});

Then('the diff modal left side should contain {string}', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'left');
});
Then('the diff modal left side should contain "{string}"', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'left');
});

Then('the diff modal right side should contain {string}', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'right');
});
Then('the diff modal right side should contain "{string}"', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'right');
});

Then('the diff modal should contain {string}', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'left');
});
Then('the diff modal should contain "{string}"', async function(content) {
  await this.navigation.expectDiffModalContains(content, 'left');
});

Then('the tabs should be ordered as {string}', async function(expectedOrder) {
  await this.tabBar.expectTabsInOrder(expectedOrder);
});
Then('the tabs should be ordered as "{string}"', async function(expectedOrder) {
  await this.tabBar.expectTabsInOrder(expectedOrder);
});

Then('the left panel should contain tabs {string}', async function(tabList) {
  await this.navigation.expectLeftPanelContainsTabs(tabList);
});
Then('the left panel should contain tabs "{string}"', async function(tabList) {
  await this.navigation.expectLeftPanelContainsTabs(tabList);
});

Then('the right panel should contain tabs {string}', async function(tabList) {
  await this.navigation.expectRightPanelContainsTabs(tabList);
});
Then('the right panel should contain tabs "{string}"', async function(tabList) {
  await this.navigation.expectRightPanelContainsTabs(tabList);
});

Then('a file should be downloaded with the name {string}', async function(expectedFileName) {
  await this.download.expectFileDownloadedWithName(expectedFileName);
});
Then('a file should be downloaded with the name "{string}"', async function(expectedFileName) {
  await this.download.expectFileDownloadedWithName(expectedFileName);
});

Then('the download modal should appear', async function() {
  await this.download.expectDownloadModalToAppear();
});

Then('a confirmation dialog should appear with message {string}', async function(expectedMessage) {
  await this.confirmationDialog.expectConfirmationDialogToAppear(expectedMessage);
});

Then('a confirmation dialog should appear with message "{string}"', async function(expectedMessage) {
  await this.confirmationDialog.expectConfirmationDialogToAppear(expectedMessage);
});