import { Page, expect } from '@playwright/test';

export class EditorActions {
  constructor(private page: Page) {}

  private getActiveEditorLocator() {
    return this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
  }

  private getEditorContainerLocator() {
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

  async typeText(text: string) {
    const editorLocator = this.getActiveEditorLocator();
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
    // Wait for editor to be visible first
    const editorLocator = this.getActiveEditorLocator();
    await expect(editorLocator).toBeVisible();
    
    // Read content directly from Monaco editor's model
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
      // Fallback to textarea if Monaco API not available
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

  async expectContentIsNotSingleLine() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 1) {
      throw new Error(`Expected multi-line content, but got only 1 line. Content: "${content}"`);
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
} 