import { Page, expect } from '@playwright/test';

export class NavigationActions {
  constructor(private page: Page) {}

  async navigateToHome() {
    await this.page.goto('http://localhost:5173/');
    // Wait for the page to load first
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the app to be visible - look for "Scratch Tabs" text
    await expect(this.page.getByText('Scratch Tabs')).toBeVisible();
    await this.waitForPageStabilization();
  }

  async clickButton(buttonText: string) {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }

  async clickLink(linkText: string) {
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }

  async clickIcon(iconName: string) {
    // Map human-readable names to test IDs
    const iconTestIdMap: { [key: string]: string } = {
      'New tab': 'icon-new-tab',
      'New tab with contents from clipboard': 'icon-new-tab-from-clipboard', 
      'New tablet': 'icon-new-tablet'
    };
    
    const testId = iconTestIdMap[iconName] || `icon-${iconName.toLowerCase().replace(/\s+/g, '-')}`;
    const locator = this.page.locator(`[data-testid="${testId}"]`);
    await expect(locator).toBeVisible();
    await locator.click();
  }

  async doubleClickOnPage() {
    // Double-click on the page body
    await this.page.locator('body').dblclick();
  }

  async waitForPageStabilization() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForSeconds(seconds: number) {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async expectUrlContains(expectedUrlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
  }

  async expectTextToExist(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectTextToBeVisible(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectTextToNotBeVisible(text: string) {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }

  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementToNotBeVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async reloadPage() {
    await this.page.reload();
    await this.waitForPageStabilization();
  }

  async refreshPage() {
    await this.reloadPage();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageStabilization();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForPageStabilization();
  }
} 