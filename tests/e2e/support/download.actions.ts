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
}