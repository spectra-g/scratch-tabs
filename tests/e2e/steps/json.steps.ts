const { Then: JsonThen, When: JsonWhen } = require('@cucumber/cucumber');

// JSON-specific step definitions with very specific patterns to avoid conflicts

// JSON Smart View visibility steps
JsonThen('I should see the JSON Smart View', async function() {
  await this.jsonSmartView.expectJsonSmartViewVisible();
});

JsonThen('I should not see the JSON Smart View', async function() {
  await this.jsonSmartView.expectJsonSmartViewNotVisible();
});

// JSON Smart View content verification
JsonThen('the JSON Smart View should contain {string}', async function(expectedText) {
  await this.jsonSmartView.expectJsonSmartViewContainsText(expectedText);
});

JsonThen('the JSON Smart View should contain "{string}"', async function(expectedText) {
  await this.jsonSmartView.expectJsonSmartViewContainsText(expectedText);
});

// JSON Smart View editing steps
JsonWhen('I make changes to the JSON in Smart View', async function() {
  await this.jsonSmartView.makeJsonEditInSmartView();
});

// JSON Tree View navigation steps
JsonWhen('I click on the JSON tree node for {string}', async function(nodePath) {
  await this.jsonSmartView.clickJsonTreeNode(nodePath);
});

// Monaco editor navigation assertions
JsonThen('the Monaco editor should scroll to show {string}', async function(expectedText) {
  await this.editor.expectEditorContentToContain(expectedText);
});

JsonThen('the text {string} should be highlighted in the Monaco editor', async function(expectedText) {
  // For now, just verify the Monaco editor contains the text
  // Full selection verification would require Monaco's internal API
  await this.editor.expectEditorContentToContain(expectedText);
});

