import { Page } from '@playwright/test';

export class ClipboardActions {
  constructor(private page: Page) {}

  async setClipboardContent(content: string) {
    // Set clipboard content using Playwright's clipboard API with better error handling
    try {
      await this.page.evaluate(async (text) => {
        await navigator.clipboard.writeText(text);
        console.log(`Clipboard set to: "${text}"`);
      }, content);
      
      // Verify the clipboard was set correctly
      const clipboardContent = await this.page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });
      
      console.log(`Verified clipboard content: "${clipboardContent}"`);
      
      if (clipboardContent !== content) {
        console.warn(`Clipboard content mismatch. Expected: "${content}", Got: "${clipboardContent}"`);
      }
    } catch (error) {
      console.error(`Failed to set clipboard: ${error.message}`);
      // Fallback: try to set clipboard using a different approach
      await this.page.evaluate((text) => {
        // Try alternative clipboard method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log(`Fallback clipboard set to: "${text}"`);
      }, content);
    }
  }

  async getClipboardContent(): Promise<string> {
    try {
      return await this.page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });
    } catch (error) {
      console.error(`Failed to get clipboard content: ${error.message}`);
      throw new Error('Could not access clipboard content');
    }
  }

  async clearClipboard() {
    await this.setClipboardContent('');
  }

  async expectClipboardContentToEqual(expectedContent: string) {
    const actualContent = await this.getClipboardContent();
    if (actualContent !== expectedContent) {
      throw new Error(`Expected clipboard content to be "${expectedContent}", but got "${actualContent}"`);
    }
  }

  async expectClipboardContentToContain(expectedText: string) {
    const actualContent = await this.getClipboardContent();
    if (!actualContent.includes(expectedText)) {
      throw new Error(`Expected clipboard content to contain "${expectedText}", but got "${actualContent}"`);
    }
  }

  async expectClipboardIsEmpty() {
    const content = await this.getClipboardContent();
    if (content.trim() !== '') {
      throw new Error(`Expected clipboard to be empty, but got "${content}"`);
    }
  }

  async expectClipboardIsNotEmpty() {
    const content = await this.getClipboardContent();
    if (content.trim() === '') {
      throw new Error('Expected clipboard to have content, but it was empty');
    }
  }

  // Helper method to simulate Ctrl+C
  async copyToClipboard() {
    await this.page.keyboard.press('Control+c');
  }

  // Helper method to simulate Ctrl+V
  async pasteFromClipboard() {
    await this.page.keyboard.press('Control+v');
  }

  // Helper method to simulate Ctrl+X
  async cutToClipboard() {
    await this.page.keyboard.press('Control+x');
  }
} 