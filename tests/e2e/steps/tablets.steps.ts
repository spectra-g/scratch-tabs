const { Then, When } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

export { }; // Make this file a module to avoid global scope conflicts

// ============================================================================
// Calculator Tablet Steps
// ============================================================================

Then('I should see a calculator interface', async function () {
  await this.tablets.expectCalculatorInterfaceVisible();
});

When('I click calculator button {string}', async function (buttonText: string) {
  await this.tablets.clickCalculatorButton(buttonText);
});

Then('the calculator display should show {string}', async function (expectedValue: string) {
  await this.tablets.expectCalculatorDisplay(expectedValue);
});

Then('I should see calculator mode selector', async function () {
  await this.tablets.expectCalculatorModeSelectorVisible();
});

Then('I should see number buttons in calculator', async function () {
  await this.tablets.expectCalculatorNumberButtonsVisible();
});

// ============================================================================
// UUID Generator Tablet Steps
// ============================================================================

Then('I should see the UUID generator interface', async function () {
  await this.tablets.expectUuidGeneratorInterfaceVisible();
});

When('I click the generate UUID button', async function () {
  await this.tablets.clickGenerateUuidButton();
});

Then('I should see at least one generated UUID in the list', async function () {
  await this.tablets.expectAtLeastOneUuidVisible();
});

// ============================================================================
// Base64 Tablet Steps
// ============================================================================

Then('I should see the Base64 encoder interface', async function () {
  await this.tablets.expectBase64InterfaceVisible();
});

When('I type {string} into the Base64 input', async function (text: string) {
  await this.tablets.typeIntoBase64Input(text);
});

Then('the Base64 output should contain {string}', async function (expectedText: string) {
  await this.tablets.expectBase64OutputContains(expectedText);
});

// ============================================================================
// Tool Selector Steps
// ============================================================================

When('I click on Base64 tool card in selector', async function () {
  // Wait for the tool selector modal to appear
  const toolSelector = this.page.getByRole('dialog', { name: 'Tool Selector' });
  await expect(toolSelector).toBeVisible();

  // Click on the Base64 tool card
  const toolCard = toolSelector.locator('button').filter({
    has: this.page.locator('span, h3').filter({ hasText: /^Base64$/ })
  }).first();

  await expect(toolCard).toBeVisible();
  await toolCard.click();

  // Wait for the modal to close
  await expect(toolSelector).not.toBeVisible();
});

// ============================================================================
// Password Generator Tablet Steps
// ============================================================================

Then('I should see the password generator interface', async function () {
  await this.tablets.expectPasswordGeneratorInterfaceVisible();
});

Then('I should see a generated password', async function () {
  await this.tablets.expectGeneratedPasswordVisible();
});

When('I click the regenerate password button', async function () {
  await this.tablets.clickRegeneratePasswordButton();
});

Then('I should see a different generated password', async function () {
  await this.tablets.expectDifferentPasswordGenerated();
});

// ============================================================================
// Lorem Ipsum Generator Tablet Steps
// ============================================================================

Then('I should see the lorem ipsum generator interface', async function () {
  await this.tablets.expectLoremIpsumInterfaceVisible();
});

Then('I should see generated lorem ipsum text', async function () {
  await this.tablets.expectLoremIpsumTextVisible();
});

// ============================================================================
// Cron Expression Builder Tablet Steps
// ============================================================================

Then('I should see the cron builder interface', async function () {
  await this.tablets.expectCronBuilderInterfaceVisible();
});

Then('I should see next execution times', async function () {
  await this.tablets.expectNextExecutionTimesVisible();
});

// ============================================================================
// Word Count Tablet Steps
// ============================================================================

Then('I should see the word count interface', async function () {
  await this.tablets.expectWordCountInterfaceVisible();
});

When('I type {string} into the word count input', async function (text: string) {
  await this.tablets.typeIntoWordCountInput(text);
});

Then('the word count should show {string} words', async function (expectedCount: string) {
  await this.tablets.expectWordCountValue(expectedCount);
});

// ============================================================================
// URL Parser Tablet Steps
// ============================================================================

Then('I should see the URL parser interface', async function () {
  await this.tablets.expectUrlParserInterfaceVisible();
});

When('I type {string} into the URL input', async function (url: string) {
  await this.tablets.typeIntoUrlInput(url);
});

Then('the URL parser should show host {string}', async function (expectedHost: string) {
  await this.tablets.expectUrlParserHost(expectedHost);
});

Then('the URL parser should show port {string}', async function (expectedPort: string) {
  await this.tablets.expectUrlParserPort(expectedPort);
});

// ============================================================================
// Checksum Tablet Steps
// ============================================================================

Then('I should see the checksum interface', async function () {
  await this.tablets.expectChecksumInterfaceVisible();
});

When('I type {string} into the checksum text input', async function (text: string) {
  await this.tablets.typeIntoChecksumInput(text);
});

Then('I should see a calculated hash', async function () {
  await this.tablets.expectCalculatedHashVisible();
});

// ============================================================================
// Colour Palette Tablet Steps
// ============================================================================

Then('I should see the colour palette interface', async function () {
  await this.tablets.expectColourPaletteInterfaceVisible();
});

Then('I should see color swatches', async function () {
  await this.tablets.expectColorSwatchesVisible();
});

// ============================================================================
// Converter Tablet Steps
// ============================================================================

Then('I should see the converter interface', async function () {
  await this.tablets.expectConverterInterfaceVisible();
});

Then('I should see converter section buttons', async function () {
  await this.tablets.expectConverterSectionButtonsVisible();
});

// ============================================================================
// Date & Time Tablet Steps
// ============================================================================

Then('I should see the date time interface', async function () {
  await this.tablets.expectDateTimeInterfaceVisible();
});

Then('I should see current time display', async function () {
  await this.tablets.expectCurrentTimeDisplayVisible();
});

// ============================================================================
// Emoji as Data Tablet Steps
// ============================================================================

Then('I should see the emoji picker interface', async function () {
  await this.tablets.expectEmojiPickerInterfaceVisible();
});

Then('I should see emoji grid', async function () {
  await this.tablets.expectEmojiGridVisible();
});

// ============================================================================
// Personal Kanban Tablet Steps
// ============================================================================

Then('I should see the Personal Kanban column {string}', async function (columnTitle: string) {
  await this.tablets.expectPersonalKanbanColumnVisible(columnTitle);
});

Then('each Personal Kanban column should show the empty state', async function () {
  await this.tablets.expectPersonalKanbanEmptyStateVisibleInEachColumn();
});
