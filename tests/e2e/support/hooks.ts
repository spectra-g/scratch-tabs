import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import { E2EWorld } from './world.js';

let browser: any;

setDefaultTimeout(30 * 1000);

BeforeAll(async function () {
  browser = await chromium.launch({ headless: false });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function () {
  // Create context with clipboard permissions granted
  this.context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  this.page = await this.context.newPage();
});

After(async function (params: any) {
  if (params.result?.status === 'FAILED') {
    const screenshot = await this.page.screenshot({
      path: `reports/screenshots/${params.pickle.name}.png`,
      fullPage: true,
    });
    this.attach(screenshot, 'image/png');
  }
  await this.page.close();
  await this.context.close();
}); 