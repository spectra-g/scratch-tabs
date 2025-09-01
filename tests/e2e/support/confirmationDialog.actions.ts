import { Page, expect } from '@playwright/test';

export class ConfirmationDialogActions {
  constructor(private page: Page) {}

  async expectConfirmationDialogToAppear(expectedMessage: string) {
    // Wait for the confirmation dialog to appear using stable data-testid
    const dialogContent = this.page.locator('[data-testid="confirmation-dialog"]');
    await expect(dialogContent).toBeVisible();
    
    // Check that the message appears in the dialog
    await expect(this.page.getByText(expectedMessage)).toBeVisible();
  }

  async clickConfirmationButton(buttonText: string) {
    // Click the confirmation button inside the dialog using stable data-testid
    const dialogContent = this.page.locator('[data-testid="confirmation-dialog"]');
    const confirmButton = dialogContent.getByRole('button', { name: buttonText });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Wait for the dialog to close
    await expect(dialogContent).not.toBeVisible();
  }

  async expectConfirmationDialogNotVisible() {
    const dialogContent = this.page.locator('[data-testid="confirmation-dialog"]');
    await expect(dialogContent).not.toBeVisible();
  }
}