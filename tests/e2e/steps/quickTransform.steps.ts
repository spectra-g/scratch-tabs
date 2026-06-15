const { When, Then } = require('@cucumber/cucumber');

export {}; // Make this file a module

When('I open the Quick Transform modal', async function () {
  await this.quickTransform.openModal();
});

When('I verify Quick Transform appears in the editor context menu', async function () {
  await this.quickTransform.verifyContextMenuEntry();
});

Then('the Quick Transform modal should be visible', async function () {
  await this.quickTransform.expectModalVisible();
});

Then('the Quick Transform modal should not be visible', async function () {
  await this.quickTransform.expectModalNotVisible();
});

When('I search for {string} in the Quick Transform modal', async function (query: string) {
  await this.quickTransform.searchFor(query);
});

When('I select the first Quick Transform result', async function () {
  await this.quickTransform.selectFirstResult();
});

Then('the Quick Transform params form should be visible', async function () {
  await this.quickTransform.expectParamsFormVisible();
});

Then('the Quick Transform params form should not exist', async function () {
  await this.quickTransform.expectParamsFormNotVisible();
});

When('I set the Quick Transform text field to {string}', async function (value: string) {
  await this.quickTransform.fillFirstTextField(value);
});

When('I apply the Quick Transform', async function () {
  await this.quickTransform.clickApply();
});

When('I press Escape in the Quick Transform modal', async function () {
  await this.quickTransform.pressEscape();
});

When('I click back in the Quick Transform params form', async function () {
  await this.quickTransform.clickBack();
});
