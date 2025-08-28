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
});