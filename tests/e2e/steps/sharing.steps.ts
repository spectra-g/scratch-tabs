const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

export { }; // Make this file a module to avoid global scope conflicts

// WHEN steps

When('I click the {string} button in the share modal', async function (buttonText) {
  await this.share.clickButtonInModal(buttonText);
});

When('I click the "{string}" button in the share modal', async function (buttonText) {
  await this.share.clickButtonInModal(buttonText);
});

When('I close the share modal', async function () {
  await this.share.closeModal();
});

When('I copy the share URL from the modal', async function () {
  await this.share.copyShareUrl();
});

When('I open the share URL in a new browser instance', async function () {
  await this.share.openShareUrlInNewContext();
});

When('I open the share URL in a new browser tab', async function () {
  await this.share.openShareUrlInNewTab();
});

// THEN steps

Then('the share modal should appear', async function () {
  await this.share.expectModalToAppear();
});

Then('the share modal should show the tab title {string}', async function (tabTitle) {
  await this.share.expectModalShowsTabTitle(tabTitle);
});

Then('the share modal should show the tab title "{string}"', async function (tabTitle) {
  await this.share.expectModalShowsTabTitle(tabTitle);
});

Then('the shareable URL input should be visible', async function () {
  await this.share.expectUrlInputVisible();
});

Then('the shareable URL input should contain {string}', async function (urlPart) {
  await this.share.expectUrlInputContains(urlPart);
});

Then('the shareable URL input should contain "{string}"', async function (urlPart) {
  await this.share.expectUrlInputContains(urlPart);
});

Then('the clipboard should contain {string}', async function (expectedContent) {
  await this.share.expectClipboardContains(expectedContent);
});

Then('the clipboard should contain "{string}"', async function (expectedContent) {
  await this.share.expectClipboardContains(expectedContent);
});

Then('the share modal should not be visible', async function () {
  await this.share.expectModalNotVisible();
});

Then('the new browser instance should have a tab with content {string}', async function (expectedContent) {
  await this.share.expectNewInstanceHasContent(expectedContent);
});

Then('the new browser instance should have a tab with content "{string}"', async function (expectedContent) {
  await this.share.expectNewInstanceHasContent(expectedContent);
});

Then('the new browser tab should show the shared content', async function () {
  await this.share.expectNewTabShowsSharedContent();
});

Then('the new browser tab should have a tab with content {string}', async function (expectedContent) {
  await this.share.expectNewTabHasContent(expectedContent);
});

Then('the new browser tab should have a tab with content "{string}"', async function (expectedContent) {
  await this.share.expectNewTabHasContent(expectedContent);
});

Then('the new browser instance should have a tab with JSON content', async function () {
  await this.share.expectNewInstanceHasJsonContent();
});

Then('the new browser instance tab content should contain {string}', async function (expectedContent) {
  await this.share.expectNewInstanceContentContains(expectedContent);
});

Then('the new browser instance tab content should contain "{string}"', async function (expectedContent) {
  await this.share.expectNewInstanceContentContains(expectedContent);
});

Then('the new browser instance tab content should not contain {string}', async function (unexpectedContent) {
  if (!this.share.newPage) {
    throw new Error('No new browser instance available. Call openShareUrlInNewContext() first.');
  }

  const content = await this.share.newPage.evaluate(() => {
    const monaco = (window as any).monaco;
    if (!monaco) return '';
    const models = monaco.editor.getModels();
    if (models.length === 0) return '';
    return models[models.length - 1].getValue();
  });

  expect(content).not.toContain(unexpectedContent);
});

Then('the new browser instance tab content should not contain "{string}"', async function (unexpectedContent) {
  if (!this.share.newPage) {
    throw new Error('No new browser instance available. Call openShareUrlInNewContext() first.');
  }

  const content = await this.share.newPage.evaluate(() => {
    const monaco = (window as any).monaco;
    if (!monaco) return '';
    const models = monaco.editor.getModels();
    if (models.length === 0) return '';
    return models[models.length - 1].getValue();
  });

  expect(content).not.toContain(unexpectedContent);
});

Then('the context menu should not show {string} option', async function (menuOption) {
  await this.contextMenu.expectMenuOptionNotVisible(menuOption);
});

Then('the context menu should not show "{string}" option', async function (menuOption) {
  await this.contextMenu.expectMenuOptionNotVisible(menuOption);
});

Then('the JSON trim UI should be visible', async function () {
  await this.share.expectJsonTrimUIShown();
});

Then('the JSON trim UI should not be visible', async function () {
  await this.share.expectJsonTrimUINotShown();
});

Then('the default trim UI should be visible', async function () {
  await this.share.expectDefaultTrimUIShown();
});

When('I toggle the JSON key {string}', async function (keyName) {
  await this.share.toggleJsonKey(keyName);
});

Then('the JSON key {string} should be {string}', async function (keyName, state) {
  const isSelected = state === 'selected';
  await this.share.expectJsonKeySelected(keyName, isSelected);
});

Then('the budget bar should show the max of {string} characters', async function (max) {
  await this.share.expectBudgetBarStatus("", max);
});
