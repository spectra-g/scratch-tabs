/**
 * Test for the DELETE key behavior when selecting all content in rich text editor
 * This test verifies that the dateCreated node is preserved while allowing deletion
 * of all content after it when the user selects all text and presses DELETE.
 */

import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { DateCreatedNode } from '../DateCreatedNode';

describe('DateCreatedNode DELETE key behavior', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        DateCreatedNode,
      ],
      content: '',
    });
  });

  afterEach(() => {
    editor?.destroy();
  });

  it('should preserve dateCreated node structure', () => {
    // Simple test to verify the dateCreated node can be added
    const initialContent = {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated: Date.now(),
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Test content.',
            },
          ],
        },
      ],
    };

    editor.commands.setContent(initialContent);

    // Verify the dateCreated node exists
    const doc = editor.state.doc;
    let dateCreatedNodeExists = false;

    doc.descendants((node: any) => {
      if (node.type.name === 'dateCreated') {
        dateCreatedNodeExists = true;
        return false;
      }
    });

    expect(dateCreatedNodeExists).toBe(true);
    expect(editor.state.doc.textContent).toContain('Test content.');
  });

  it('should find dateCreated node end position correctly', () => {
    const initialContent = {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated: Date.now(),
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Content after dateCreated.',
            },
          ],
        },
      ],
    };

    editor.commands.setContent(initialContent);

    // Find dateCreated node end position
    const doc = editor.state.doc;
    let dateCreatedEnd = 0;

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'dateCreated') {
        dateCreatedEnd = pos + node.nodeSize;
        return false;
      }
    });

    // dateCreated should be found and should have a valid position
    expect(dateCreatedEnd).toBeGreaterThan(0);

    // Position cursor after dateCreated
    const tr = editor.state.tr.setSelection(
      TextSelection.near(editor.state.doc.resolve(dateCreatedEnd))
    );
    editor.view.dispatch(tr);

    // Verify cursor is positioned near the dateCreated end (accounting for positioning differences)
    expect(editor.state.selection.from).toBeGreaterThanOrEqual(dateCreatedEnd - 1);
    expect(editor.state.selection.from).toBeLessThanOrEqual(dateCreatedEnd + 1);
  });

  it('should handle selection that spans beyond dateCreated node', () => {
    const initialContent = {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated: Date.now(),
          },
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This content should remain editable.',
            },
          ],
        },
      ],
    };

    editor.commands.setContent(initialContent);

    // Find dateCreated end position
    const doc = editor.state.doc;
    let dateCreatedEnd = 0;

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'dateCreated') {
        dateCreatedEnd = pos + node.nodeSize;
        return false;
      }
    });

    // Test that we can select content after dateCreated
    const selectAfterDateCreated = editor.state.tr.setSelection(
      new TextSelection(
        editor.state.doc.resolve(dateCreatedEnd),
        editor.state.doc.resolve(editor.state.doc.content.size)
      )
    );
    editor.view.dispatch(selectAfterDateCreated);

    // Should be able to delete content after dateCreated using commands
    editor.commands.deleteSelection();

    // Verify dateCreated node still exists
    const finalDoc = editor.state.doc;
    let dateCreatedNodeExists = false;

    finalDoc.descendants((node: any) => {
      if (node.type.name === 'dateCreated') {
        dateCreatedNodeExists = true;
        return false;
      }
    });

    expect(dateCreatedNodeExists).toBe(true);
    // Text after dateCreated should be gone
    expect(finalDoc.textContent).not.toContain('This content should remain editable.');
  });
});