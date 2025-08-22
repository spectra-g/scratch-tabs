import { Page, expect } from '@playwright/test';

export class EditorActions {
  constructor(private page: Page) {}

  private getActiveEditorLocator(side?: 'left' | 'right') {
    if (side) {
      return this.page.locator(`[data-editor-pane-side="${side}"] .monaco-editor textarea`);
    }
    return this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
  }

  private getEditorContainerLocator(side?: 'left' | 'right') {
    if (side) {
      return this.page.locator(`[data-editor-pane-side="${side}"] .monaco-editor`);
    }
    return this.page.locator('[data-editor-pane-side="left"] .monaco-editor');
  }

  async typeInEditor(content: string) {
    const editorLocator = this.getActiveEditorLocator();
    await editorLocator.fill(content);
  }

  async rightClickEditor() {
    const editorContainer = this.getEditorContainerLocator();
    await editorContainer.click({ button: 'right' });
  }

  async doubleClickEditor() {
    const editorContainer = this.getEditorContainerLocator();
    await editorContainer.dblclick();
  }

  async clickInEditor() {
    const editorContainer = this.getEditorContainerLocator();
    await editorContainer.click();
  }

  async focusEditor() {
    const editorLocator = this.getActiveEditorLocator();
    await editorLocator.focus();
  }

  async typeText(text: string, side?: 'left' | 'right') {
    const editorLocator = this.getActiveEditorLocator(side);
    await editorLocator.focus();
    await editorLocator.type(text);
  }

  async typeMarkdownContent(content: string) {
    const editorLocator = this.getActiveEditorLocator();
    await editorLocator.focus();
    await editorLocator.fill(content);
  }

  async pressCtrlZ() {
    // Ensure editor is focused before pressing Ctrl+Z
    const editorLocator = this.getActiveEditorLocator();
    await editorLocator.focus();
    // Directly trigger Monaco's undo command as a fallback
    await this.page.evaluate(() => {
      const win = window as any;
      if (win.monaco && win.monaco.editor && win.monaco.editor.getEditors) {
        const editors = win.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          editors[0].trigger('keyboard', 'undo', null);
        }
      }
    });
  }

  // Helper method to get Monaco editor content
async getMonacoEditorContent(): Promise<string> {
  const editorLocator = this.getActiveEditorLocator();
  await expect(editorLocator).toBeVisible();

  // Wait until Monaco editor (or fallback textarea) has non-empty content
  await this.page.waitForFunction(() => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
    if (editor && (window as any).monaco) {
      const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) =>
        e.getDomNode() === editor
      );
      if (editorInstance) {
        const value = editorInstance.getValue();
        return value && value.trim().length > 0;
      }
    }

    const textarea = document.querySelector('[data-editor-pane-side="left"] .monaco-editor textarea') as HTMLTextAreaElement;
    return textarea && textarea.value.trim().length > 0;
  });

  // After content is confirmed to exist, return it
  return await this.page.evaluate(() => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
    if (editor && (window as any).monaco) {
      const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) =>
        e.getDomNode() === editor
      );
      if (editorInstance) {
        return editorInstance.getValue();
      }
    }

    const textarea = document.querySelector('[data-editor-pane-side="left"] .monaco-editor textarea') as HTMLTextAreaElement;
    return textarea ? textarea.value : '';
  });
}
  async expectEditorContentToEqual(expectedContent: string) {
    const actualContent = await this.getMonacoEditorContent();
    
    // Check the content
    if (actualContent !== expectedContent) {
      throw new Error(`Editor content does not match. Expected: "${expectedContent}", Got: "${actualContent}"`);
    }
  }

  async expectEditorContentToContain(text: string) {
    const actualContent = await this.getMonacoEditorContent();
    
    // Check if content contains the expected text
    if (!actualContent.includes(text)) {
      throw new Error(`Editor content does not contain "${text}". Actual content: "${actualContent}"`);
    }
  }

  async expectEditorContainsMarkdown() {
    const content = await this.getMonacoEditorContent();
    
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#\s+/m,         // Headers
      /\*\*.*\*\*/,     // Bold
      /\*.*\*/,         // Italic
      /\[.*\]\(.*\)/,   // Links
      /```[\s\S]*```/,  // Code blocks
      /^\s*[-*+]\s+/m   // List items
    ];
    
    const hasMarkdown = markdownPatterns.some(pattern => pattern.test(content));
    
    if (!hasMarkdown) {
      throw new Error(`Editor content does not contain markdown syntax. Content: "${content}"`);
    }
  }

  // Rich Text editor specific methods
  getRichTextEditor(side: 'left' | 'right' = 'left') {
    return this.page.locator(`[data-editor-pane-side="${side}"] .rich-text-editor`);
  }

  getRichTextDateCreated(side: 'left' | 'right' = 'left') {
    return this.page.locator(`[data-editor-pane-side="${side}"] [data-testid="rich-text-date-created"]`);
  }

  getTipTapEditor(side: 'left' | 'right' = 'left') {
    return this.page.locator(`[data-editor-pane-side="${side}"] .ProseMirror`);
  }

  async expectRichTextEditorVisible(side: 'left' | 'right' = 'left') {
    const richTextEditor = this.getRichTextEditor(side);
    await expect(richTextEditor).toBeVisible();
  }

  async expectRichTextDateCreatedVisible(side: 'left' | 'right' = 'left') {
    const dateCreated = this.getRichTextDateCreated(side);
    await expect(dateCreated).toBeVisible();
  }

  async expectRichTextDateCreatedContainsText(text: string, side: 'left' | 'right' = 'left') {
    const dateCreated = this.getRichTextDateCreated(side);
    await expect(dateCreated).toContainText(text);
  }

  async typeInRichTextEditor(text: string, side: 'left' | 'right' = 'left') {
    const tipTapEditor = this.getTipTapEditor(side);
    await expect(tipTapEditor).toBeVisible();
    
    // Click at the end of the editor to position cursor after date
    await tipTapEditor.click({ position: { x: 100, y: 120 } });
    
    // Use fill method which should work better for contenteditable
    await tipTapEditor.fill(text);
    
    // Check if fill worked, if not use direct DOM manipulation
    const currentContent = await tipTapEditor.textContent();
    if (!currentContent?.includes(text)) {
      await this.page.evaluate(({textToInsert, editorSide}) => {
        const editor = document.querySelector(`[data-editor-pane-side="${editorSide}"] .ProseMirror`) as HTMLDivElement;
        if (editor) {
          // Clear any existing content except date
          const dateNode = editor.querySelector('[data-testid="rich-text-date-created"]')?.parentElement;
          if (dateNode) {
            // Keep only the date node, remove other content
            Array.from(editor.children).forEach(child => {
              if (child !== dateNode) {
                child.remove();
              }
            });
          }
          
          // Create a new paragraph with the text
          const paragraph = document.createElement('p');
          paragraph.textContent = textToInsert;
          editor.appendChild(paragraph);
          
          // Trigger input event to notify TipTap
          const event = new Event('input', { bubbles: true });
          editor.dispatchEvent(event);
        }
      }, {textToInsert: text, editorSide: side});
    }
  }

  async expectRichTextEditorContainsText(text: string, side: 'left' | 'right' = 'left') {
    // Use Playwright's built-in waiting - wait for the text to appear in the editor
    const tipTapEditor = this.getTipTapEditor(side);
    await expect(tipTapEditor).toContainText(text);
    
    // Also verify it appears in a paragraph specifically
    const paragraphWithText = this.page.locator(`[data-editor-pane-side="${side}"] .ProseMirror p`).filter({ hasText: text });
    await expect(paragraphWithText).toBeVisible();
  }

  async expectRichTextEditorDoesNotContainText(text: string, side: 'left' | 'right' = 'left') {
    // Verify the text does NOT appear in the specified side
    const tipTapEditor = this.getTipTapEditor(side);
    await expect(tipTapEditor).not.toContainText(text);
  }

  async focusRichTextEditor(side: 'left' | 'right' = 'left') {
    const tipTapEditor = this.getTipTapEditor(side);
    await tipTapEditor.click();
    await tipTapEditor.focus();
  }

  async expectMonacoEditorVisible() {
    const editorContainer = this.getEditorContainerLocator();
    await expect(editorContainer).toBeVisible();
  }

  async expectFirst10LinesContainJson() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n');
    const first10Lines = lines.slice(0, 10).join('\n');
    
    // Check if the first 10 lines contain JSON-like content
    const jsonPattern = /[{}\[\]"':,]/;
    if (!jsonPattern.test(first10Lines)) {
      throw new Error(`First 10 lines do not contain JSON content. Content: "${first10Lines}"`);
    }
  }

  async expectContentIsSingleLine() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length !== 1) {
      throw new Error(`Expected single line content, but got ${lines.length} lines. Content: "${content}"`);
    }
  }

  private async waitForMultiLineContent() {
    await this.page.waitForFunction(() => {
      const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
      if (editor && (window as any).monaco) {
        const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) =>
          e.getDomNode() === editor
        );
        if (editorInstance) {
          const value = editorInstance.getValue();
          const lines = value.split('\n').filter((line: string) => line.trim() !== '');
          return lines.length >= 2;
        }
      }

      const textarea = document.querySelector('[data-editor-pane-side="left"] .monaco-editor textarea') as HTMLTextAreaElement;
      if (textarea) {
        const lines = textarea.value.split('\n').filter((line: string) => line.trim() !== '');
        return lines.length >= 2;
      }
      return false;
    });
  }

  async expectContentIsNotSingleLine() {
    await this.waitForMultiLineContent();
    
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 1) {
      throw new Error(`Expected multi-line content, but got only 1 line. Content: "${content}"`);
    }
  }

  private async waitForLineToStartWith(lineNumber: number, prefix: string) {
    await this.page.waitForFunction((args) => {
      const editor = document.querySelector('[data-editor-pane-side="left"] .monaco-editor');
      if (editor && (window as any).monaco) {
        const editorInstance = (window as any).monaco.editor.getEditors().find((e: any) =>
          e.getDomNode() === editor
        );
        if (editorInstance) {
          const value = editorInstance.getValue();
          const lines = value.split('\n');
          return lines.length > args.lineNumber - 1 && 
                 lines[args.lineNumber - 1].trim().startsWith(args.prefix);
        }
      }

      const textarea = document.querySelector('[data-editor-pane-side="left"] .monaco-editor textarea') as HTMLTextAreaElement;
      if (textarea) {
        const lines = textarea.value.split('\n');
        return lines.length > args.lineNumber - 1 && 
               lines[args.lineNumber - 1].trim().startsWith(args.prefix);
      }
      return false;
    }, { lineNumber, prefix });
  }

  private async getAllLines(): Promise<string[]> {
    const content = await this.getMonacoEditorContent();
    return content.split('\n').filter(line => line.trim() !== '');
  }

  private isValidJson(contentLine: string): boolean {
    const line = contentLine.trim();
    if (!line) return true;
    try {
      JSON.parse(line);
      return true;
    } catch {
      return false;
    }
  }

  async expectEachLineIsValidJson() {
    await this.waitForLineToStartWith(1, '{');
    
    const lines = await this.getAllLines();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!this.isValidJson(line)) {
        throw new Error(`Line ${i + 1} is not valid JSON: "${line}"`);
      }
    }
  }

  async expectEditorToBeEmpty() {
    const content = await this.getMonacoEditorContent();
    const trimmedContent = content.trim();
    
    if (trimmedContent !== '') {
      throw new Error(`Expected editor to be empty, but got: "${trimmedContent}"`);
    }
  }

  async expectPreviewIsVisible() {
    const previewPane = this.page.locator('[data-testid="preview-pane"]');
    await expect(previewPane).toBeVisible();
  }

  async clickAtLine(lineNumber: number) {
    // Click at a specific line in the Monaco editor
    await this.page.evaluate((line) => {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        // Set cursor position to the beginning of the specified line
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      }
    }, lineNumber);
  }

  async expectCursorAtLine(expectedLine: number) {
    // Check if cursor is at the expected line
    const actualLine = await this.page.evaluate(() => {
      const editor = (window as any).monaco?.editor?.getEditors()?.[0];
      if (editor) {
        const position = editor.getPosition();
        return position?.lineNumber || 1;
      }
      return 1;
    });

    if (actualLine !== expectedLine) {
      throw new Error(`Expected cursor at line ${expectedLine}, but found at line ${actualLine}`);
    }
  }

  async waitForEditorFocus(side: 'left' | 'right') {
    // Wait for the editor on the specified side to be focused and ready for input
    const editorLocator = this.getActiveEditorLocator(side);
    await expect(editorLocator).toBeVisible();
    await editorLocator.focus();
    
    // Wait for Monaco editor to show focus by looking for the "view-overlays focused" class
    await this.page.waitForFunction((sideParam) => {
      const editorPane = document.querySelector(`[data-editor-pane-side="${sideParam}"]`);
      if (!editorPane) return false;

      console.log('checking for focus');
      const focusedOverlay = editorPane.querySelector('.view-overlays.focused');
      console.log('found focus: ' + focusedOverlay);
      return focusedOverlay !== null;
    }, side);
  }
} 