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
