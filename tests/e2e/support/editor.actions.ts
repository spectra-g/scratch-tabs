import { Page, expect, JSHandle } from '@playwright/test';

export class EditorActions {
  constructor(private page: Page) {}

//   private getActiveEditorLocator(side?: 'left' | 'right') {
//     if (side) {
//       return this.page.locator(`[data-editor-pane-side="${side}"] .monaco-editor textarea`);
//     }
//     return this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
//   }

  private getEditorContainerLocator(side?: 'left' | 'right') {
    if (side) {
      return this.page.locator(`[data-editor-pane-side="${side}"] .monaco-editor`);
    }
    return this.page.locator('[data-editor-pane-side="left"] .monaco-editor');
  }

  private async waitForMonacoEditorAPI(side: 'left' | 'right' = 'left') {
    const editorIndex = side === 'right' ? 1 : 0;
    await this.page.waitForFunction((index) => {
      const editors = (window as any).monaco?.editor?.getEditors();
      return editors && editors.length > index && editors[index].getModel();
    }, editorIndex, {
      polling: 100,
    }).catch(e => {
      throw new Error(`Timed out waiting for Monaco Editor API. Side: ${side}. Error: ${e.message}`);
    });
  }

  async typeInEditor(content: string) {
    const editorInstance = await this.getVisibleEditorInstance();

    await editorInstance?.evaluate((editor, text) => {
      const model = editor.getModel();
      if (model) {
        const fullRange = model.getFullModelRange();
        model.pushEditOperations([], [{ range: fullRange, text }], () => null);
        editor.pushUndoStop();
      }
    }, content);
  }

  async rightClickEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance?.getProperty('domNode');
    await domNodeHandle?.asElement()?.click({ button: 'right' });
  }

  async doubleClickEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance?.getProperty('domNode');
    await domNodeHandle?.asElement()?.dblclick();
  }

  async clickInEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance?.getProperty('domNode');
    await domNodeHandle?.asElement()?.click();
  }

  async focusEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    await editorInstance?.evaluate(editor => editor.focus());
  }

  async typeText(text: string, side?: 'left' | 'right') {
    const editorInstance = await this.getVisibleEditorInstance(side);

    await editorInstance?.evaluate((editor, newText) => {
      const model = editor.getModel();
      const position = editor.getPosition();
      if (model && position) {
        model.pushEditOperations(
          [],
          [{ range: new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: newText }],
          () => null
        );
        editor.pushUndoStop();
      }
    }, text);
  }

  async getMonacoEditorContent(): Promise<string> {
    const editorInstance = await this.getVisibleEditorInstance();
    const content = await editorInstance?.evaluate((editor) => editor.getValue());
    return content || '';
  }

  private async getVisibleEditorInstance(side?: 'left' | 'right'): Promise<JSHandle | null> {
    await this.waitForMonacoEditorAPI(side || 'left');
    return this.page.evaluateHandle((sideParam) => {
      const editors = (window as any).monaco?.editor?.getEditors();
      if (!editors) return null;

      // If side is specified, find the editor for that specific side
      if (sideParam) {
        const editorPaneSelector = `[data-editor-pane-side="${sideParam}"]`;
        const editorPane = document.querySelector(editorPaneSelector);
        if (editorPane) {
          return editors.find((editor: any) => {
            const domNode = editor.getDomNode();
            return domNode && editorPane.contains(domNode);
          });
        }
      }

      // Fallback: find any visible editor
      return editors.find((editor: any) => {
        const domNode = editor.getDomNode();
        return domNode && !!(domNode.offsetWidth || domNode.offsetHeight || domNode.getClientRects().length);
      });
    }, side);
  }

  async pressCtrlZ() {
    const editorInstance = await this.getVisibleEditorInstance();
    await editorInstance?.evaluate(editor => {
      editor.getModel()?.undo();
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
    
    // Use character-by-character typing to expose any focus loss issues
    await tipTapEditor.type(text);
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
    if (content.trim() !== '') {
      throw new Error(`Expected editor to be empty, but got: "${content}"`);
    }
  }

  async expectPreviewIsVisible() {
    const previewPane = this.page.locator('[data-testid="preview-pane"]');
    await expect(previewPane).toBeVisible();
  }

  async clickAtLine(lineNumber: number) {
    const editorInstance = await this.getVisibleEditorInstance();
    await editorInstance?.evaluate((editor, line) => {
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    }, lineNumber);
  }

  async expectCursorAtLine(expectedLine: number) {
    await expect.poll(async () => {
      const editorInstance = await this.getVisibleEditorInstance();
      return editorInstance?.evaluate(editor => editor.getPosition()?.lineNumber);
    }, {
      message: `Expected cursor to be at line ${expectedLine}, but it was not.`,
    }).toBe(expectedLine);
  }

//   async waitForEditorFocus(side: 'left' | 'right') {
//     // Wait for the editor on the specified side to be focused and ready for input
//     const editorLocator = this.getActiveEditorLocator(side);
//     await expect(editorLocator).toBeVisible();
//     await editorLocator.focus();
//
//     // Wait for Monaco editor to show focus by looking for the "view-overlays focused" class
//     await this.page.waitForFunction((sideParam) => {
//       const editorPane = document.querySelector(`[data-editor-pane-side="${sideParam}"]`);
//       if (!editorPane) return false;
//
//       const focusedOverlay = editorPane.querySelector('.view-overlays.focused');
//       return focusedOverlay !== null;
//     }, side);
//   }
} 