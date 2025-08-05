import { Page, expect } from '@playwright/test';

export class ConfirmationDialogActions {
  constructor(private page: Page) {}

  async expectConfirmationDialogToAppear(expectedMessage: string) {
    // Wait for the confirmation dialog to appear - it has a backdrop and the modal content
    const dialogContent = this.page.locator('.bg-gray-850.p-4.rounded-lg.shadow-2xl');
    await expect(dialogContent).toBeVisible();
    
    // Check that the message appears in the dialog
    await expect(this.page.getByText(expectedMessage)).toBeVisible();
  }

  async clickConfirmationButton(buttonText: string) {
    // Click the confirmation button inside the dialog - be more specific to avoid conflicts
    const dialogContent = this.page.locator('.bg-gray-850.p-4.rounded-lg.shadow-2xl');
    const confirmButton = dialogContent.getByRole('button', { name: buttonText });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Wait for the dialog to close - check that the dialog content is no longer visible
    await expect(dialogContent).not.toBeVisible();
  }
}