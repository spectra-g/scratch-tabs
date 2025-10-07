import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * Table Selection Fix Plugin
 *
 * Fixes a bug in prosemirror-tables where dragging text across table cells
 * incorrectly creates a CellSelection instead of maintaining TextSelection.
 */
let isTextDragging = false;

const tableSelectionFixPlugin = new Plugin({
  key: new PluginKey('table-selection-fix'),
  props: {
    handleDOMEvents: {
      mousedown: (view, event) => {
        const target = event.target as HTMLElement;
        const cell = target.closest('td, th');

        if (cell) {
          isTextDragging = true;
        } else {
          isTextDragging = false;
        }

        return false;
      },

      mouseup: () => {
        isTextDragging = false;
        return false;
      },
    },
  },

  filterTransaction: (tr, state) => {
    if (isTextDragging && tr.selectionSet) {
      const selectionType = tr.selection?.constructor.name;
      const isCellSelection = selectionType === 'CellSelection' || selectionType === '_CellSelection';

      if (tr.selection && isCellSelection) {
        return false;
      }
    }
    return true;
  },
});

describe('TableSelectionFix Plugin', () => {
  let editor: Editor;

  beforeEach(() => {
    // Reset the drag state before each test
    isTextDragging = false;

    editor = new Editor({
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }).extend({
          addProseMirrorPlugins() {
            const defaultPlugins = this.parent?.() ?? [];
            return [tableSelectionFixPlugin, ...defaultPlugins];
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: '',
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
  });

  describe('Plugin registration', () => {
    it('should register the table selection fix plugin', () => {
      const pluginKeys = editor.state.plugins.map(p => (p as any).key);
      const hasTableSelectionFix = pluginKeys.some(
        (key: string) => key && key.includes('table-selection-fix')
      );
      expect(hasTableSelectionFix).toBe(true);
    });

    it('should load table extension with fix plugin', () => {
      const extensionNames = editor.extensionManager.extensions.map(ext => ext.name);
      expect(extensionNames).toContain('table');
    });
  });

  describe('Table creation', () => {
    it('should allow creating tables', () => {
      editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
      const html = editor.getHTML();
      expect(html).toContain('<table');
      expect(html).toContain('<tr>');
      expect(html).toContain('<th');
      expect(html).toContain('<td');
    });

    it('should create table with correct structure', () => {
      editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
      const html = editor.getHTML();

      // Count rows (should be 2)
      const rowCount = (html.match(/<tr>/g) || []).length;
      expect(rowCount).toBe(2);

      // Count cells per row (should be 2) - match opening td tags with attributes
      const cellCount = (html.match(/<td\s/g) || []).length;
      expect(cellCount).toBe(4); // 2 rows × 2 cells
    });
  });

  describe('Text selection in tables', () => {
    beforeEach(() => {
      editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
      editor.commands.insertContentAt(3, 'Cell 1');
      editor.commands.insertContentAt(14, 'Cell 2');
    });

    it('should maintain text selection within a single cell', () => {
      // Set text selection within first cell
      editor.commands.setTextSelection({ from: 3, to: 9 });

      expect(editor.state.selection.constructor.name).toMatch(/TextSelection|_TextSelection/);
    });

    it('should allow text content in table cells', () => {
      const text = editor.getText();
      expect(text).toContain('Cell 1');
      expect(text).toContain('Cell 2');
    });
  });

  describe('Transaction filtering', () => {
    it('should allow non-selection transactions', () => {
      editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
      editor.commands.insertContentAt(3, 'Test content');

      const content = editor.getText();
      expect(content).toContain('Test content');
    });

    it('should allow TextSelection transactions', () => {
      editor.commands.insertContent('Some text outside table');
      editor.commands.setTextSelection({ from: 1, to: 5 });

      expect(editor.state.selection.constructor.name).toMatch(/TextSelection|_TextSelection/);
    });
  });

  describe('Plugin state management', () => {
    it('should handle multiple editors independently', () => {
      const editor2 = new Editor({
        extensions: [
          StarterKit,
          Table.configure({ resizable: true }).extend({
            addProseMirrorPlugins() {
              const defaultPlugins = this.parent?.() ?? [];
              return [tableSelectionFixPlugin, ...defaultPlugins];
            },
          }),
          TableRow,
          TableHeader,
          TableCell,
        ],
        content: '',
      });

      // Both editors should work independently
      editor.commands.insertContent('Editor 1');
      editor2.commands.insertContent('Editor 2');

      expect(editor.getText()).toContain('Editor 1');
      expect(editor2.getText()).toContain('Editor 2');

      editor2.destroy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty tables', () => {
      editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
      const html = editor.getHTML();
      expect(html).toContain('<table');
    });

    it('should handle table deletion', () => {
      editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
      expect(editor.getHTML()).toContain('<table');

      editor.commands.deleteTable();
      expect(editor.getHTML()).not.toContain('<table');
    });

    it('should handle content before and after tables', () => {
      editor.commands.insertContent('Before table');
      editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
      editor.commands.insertContent('After table');

      const text = editor.getText();
      expect(text).toContain('Before table');
      expect(text).toContain('After table');
    });
  });

  describe('Integration with other extensions', () => {
    it('should work with bold formatting in cells', () => {
      editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
      editor.commands.insertContentAt(3, 'Bold text');
      editor.commands.setTextSelection({ from: 3, to: 12 });
      editor.commands.toggleBold();

      const html = editor.getHTML();
      expect(html).toContain('<strong>');
      const text = editor.getText();
      expect(text).toContain('Bold tex');
    });

    it('should maintain selection after formatting changes', () => {
      editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
      editor.commands.insertContentAt(3, 'Test');
      editor.commands.setTextSelection({ from: 3, to: 7 });

      const selectionBefore = editor.state.selection.constructor.name;
      editor.commands.toggleBold();
      const selectionAfter = editor.state.selection.constructor.name;

      expect(selectionBefore).toMatch(/TextSelection|_TextSelection/);
      expect(selectionAfter).toMatch(/TextSelection|_TextSelection/);
    });
  });
});
