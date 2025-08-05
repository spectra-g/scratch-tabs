import { Page, expect, Download } from '@playwright/test';

export class DownloadActions {
  private downloadPromise: Promise<Download> | null = null;

  constructor(private page: Page) {}

  // Set up download listening before triggering the download action
  startDownloadCapture() {
    this.downloadPromise = this.page.waitForEvent('download');
  }

  async expectFileDownloadedWithName(expectedFileName: string) {
    // If no download promise was set up, set it up now (fallback)
    if (!this.downloadPromise) {
      this.downloadPromise = this.page.waitForEvent('download');
    }
    
    try {
      // Wait for the download event
      const download = await this.downloadPromise;
      
      // Verify the download filename matches expected
      const actualFileName = download.suggestedFilename();
      expect(actualFileName).toBe(expectedFileName);
      
      // Reset the download promise for next test
      this.downloadPromise = null;
    } catch (error) {
      // Reset the download promise even if there was an error
      this.downloadPromise = null;
      throw error;
    }
  }

  async expectDownloadModalToAppear() {
    // Wait for the download modal to appear by looking for the "Download Tabs" title
    await expect(this.page.getByText('Download Tabs')).toBeVisible();
  }

  async clickSelectAllInModal() {
    // Click the "Select All" button in the download modal
    const selectAllButton = this.page.getByRole('button', { name: 'Select All' });
    await expect(selectAllButton).toBeVisible();
    await selectAllButton.click();
  }

  async clickDownloadFilesInModal(buttonText: string) {
    // Set up download capture before clicking the download button
    this.startDownloadCapture();
    
    // Click the download button (e.g., "Download 3 Files")
    const downloadButton = this.page.getByRole('button', { name: buttonText });
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();
  }
}