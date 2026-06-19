const { Then: XmlThen, When: XmlWhen } = require('@cucumber/cucumber');

XmlThen('I should see the XML Smart View', async function () {
  await this.xmlSmartView.expectVisible();
});

XmlThen('I should not see the XML Smart View', async function () {
  await this.xmlSmartView.expectNotVisible();
});

XmlThen('the XML Smart View should contain {string}', async function (text: string) {
  await this.xmlSmartView.expectContainsText(text);
});

XmlWhen('I click the XML toolbar button {string}', async function (label: string) {
  await this.xmlSmartView.clickToolbarButton(label);
});

XmlWhen('I click the XML bottom tab {string}', async function (label: string) {
  await this.xmlSmartView.clickBottomTab(label);
});

XmlThen('the XML XPath workbench should be visible', async function () {
  await this.xmlSmartView.expectXPathWorkbenchVisible();
});
