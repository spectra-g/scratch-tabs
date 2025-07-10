const { Given } = require('@cucumber/cucumber');

Given('I am on the home page', async function() {
  await this.navigateToHome();
});

Given('I am on the homepage', async function() {
  await this.navigateToHome();
}); 