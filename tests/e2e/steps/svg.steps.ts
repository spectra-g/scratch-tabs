const { Then: SvgThen, When: SvgWhen } = require('@cucumber/cucumber');

// SVG-specific step definitions with very specific patterns to avoid conflicts

// SVG Smart View visibility steps
SvgThen('I should see the SVG Smart View', async function() {
  await this.svgSmartView.expectSvgSmartViewVisible();
});

SvgThen('I should not see the SVG Smart View', async function() {
  await this.svgSmartView.expectSvgSmartViewNotVisible();
});

// SVG preview visibility steps
SvgThen('the SVG preview should be visible', async function() {
  await this.svgSmartView.expectSvgPreviewVisible();
});

// SVG Smart View content verification
SvgThen('the SVG Smart View should contain {string}', async function(expectedText) {
  await this.svgSmartView.expectSvgSmartViewContainsText(expectedText);
});

SvgThen('the SVG Smart View should contain "{string}"', async function(expectedText) {
  await this.svgSmartView.expectSvgSmartViewContainsText(expectedText);
});