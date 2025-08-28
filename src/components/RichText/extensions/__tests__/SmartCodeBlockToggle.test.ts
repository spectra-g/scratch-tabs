import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SmartCodeBlockToggle } from '../SmartCodeBlockToggle';

describe('SmartCodeBlockToggle', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        SmartCodeBlockToggle,
      ],
      content: '',
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe('Extension setup', () => {
    it('should have the extension properly loaded', () => {
      const extensionNames = editor.extensionManager.extensions.map(ext => ext.name);
      expect(extensionNames).toContain('smartCodeBlockToggle');
    });

    it('should initialize with default storage', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension).toBeDefined();
      expect(extension?.storage.lastLanguage).toBe('javascript');
    });

    it('should provide toggleCodeBlockSmart command', () => {
      expect(typeof (editor.commands as any).toggleCodeBlockSmart).toBe('function');
    });

    it('should provide refreshCodeBlockHighlighting command', () => {
      expect(typeof (editor.commands as any).refreshCodeBlockHighlighting).toBe('function');
    });
  });

  describe('Storage functionality', () => {
    it('should allow reading stored language', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension?.storage.lastLanguage).toBe('javascript');
    });

    it('should have accessible storage object', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension?.storage).toBeDefined();
      expect(typeof extension?.storage.lastLanguage).toBe('string');
    });
  });

  describe('Command registration', () => {
    it('should register commands successfully', () => {
      // Check that commands exist
      expect((editor.commands as any).toggleCodeBlockSmart).toBeDefined();
      expect((editor.commands as any).refreshCodeBlockHighlighting).toBeDefined();
      
      // Check that they are functions
      expect(typeof (editor.commands as any).toggleCodeBlockSmart).toBe('function');
      expect(typeof (editor.commands as any).refreshCodeBlockHighlighting).toBe('function');
    });
  });

  describe('Integration with editor', () => {
    it('should work with basic editor operations', () => {
      // Test basic editor functionality
      editor.commands.insertContent('Hello world');
      expect(editor.getText()).toContain('Hello world');
      
      // Extension should still be available
      expect(typeof (editor.commands as any).toggleCodeBlockSmart).toBe('function');
    });

    it('should maintain extension after content changes', () => {
      // Change editor content
      editor.commands.insertContent('Test content');
      editor.commands.setTextSelection(5);
      
      // Extension should still be registered
      expect((editor.commands as any).toggleCodeBlockSmart).toBeDefined();
      expect((editor.commands as any).refreshCodeBlockHighlighting).toBeDefined();
    });
  });

  describe('Extension structure', () => {
    it('should have correct extension name', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension?.name).toBe('smartCodeBlockToggle');
    });

    it('should have storage with lastLanguage property', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension?.storage).toHaveProperty('lastLanguage');
    });

    it('should initialize storage with correct default value', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'smartCodeBlockToggle');
      expect(extension?.storage.lastLanguage).toBe('javascript');
    });
  });

  describe('Multi-line selection handling', () => {
    it('should handle editor with multi-line content', () => {
      // Insert multi-line content
      editor.commands.insertContent('Line 1\nLine 2\nLine 3');
      
      // Select all content
      editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
      
      // Verify selection exists and has newlines
      const { from, to } = editor.state.selection;
      expect(from).not.toBe(to);
      
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      expect(selectedText.includes('\n')).toBe(true);
    });

    it('should detect multi-line selections correctly', () => {
      // Create multi-line content
      editor.commands.insertContent('First line\nSecond line');
      
      // Select across lines  
      editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
      
      // Get the selection info
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      
      // Verify we detected multi-line content
      expect(selectedText).toContain('\n');
      expect(selectedText).toContain('First line');
      expect(selectedText).toContain('Second line');
    });

    it('should handle single line selections without newlines', () => {
      // Insert single line content
      editor.commands.insertContent('Single line content');
      
      // Select part of the line
      editor.commands.setTextSelection({ from: 1, to: 7 }); // "Single"
      
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      
      // Should not contain newlines
      expect(selectedText.includes('\n')).toBe(false);
      expect(selectedText).toBe('Single');
    });
  });
});