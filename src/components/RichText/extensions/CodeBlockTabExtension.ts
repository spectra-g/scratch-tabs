import { Extension } from '@tiptap/core';

/**
 * Extension to handle Tab and Shift+Tab indentation within code blocks
 * This prevents the default tab behavior (focus change) and adds/removes indentation
 */
export const CodeBlockTabExtension = Extension.create({
  name: 'codeBlockTab',

  addKeyboardShortcuts() {
    return {
      // Tab: Add indentation (2 spaces)
      Tab: () => {
        const { editor } = this;
        
        // Only handle tab if we're inside a code block
        if (!editor.isActive('codeBlock')) {
          return false; // Let default behavior handle it
        }

        // Insert 2 spaces for indentation
        return editor.chain().insertContent('  ').run();
      },

      // Shift+Tab: Remove indentation
      'Shift-Tab': () => {
        const { editor } = this;
        
        // Only handle shift+tab if we're inside a code block
        if (!editor.isActive('codeBlock')) {
          return false; // Let default behavior handle it
        }

        try {
          const { state } = editor;
          const { selection } = state;
          const { from } = selection;
          
          // Get the resolved position
          const resolvedPos = state.doc.resolve(from);
          
          // Find the current paragraph (which in a code block represents a line)
          const currentParent = resolvedPos.parent;
          const parentPos = resolvedPos.start() - 1;
          
          // Get the text of the current line/paragraph
          const lineText = currentParent.textContent;
          
          // Check if line starts with spaces that we can remove
          const leadingSpaces = lineText.match(/^( {1,2})/);
          if (leadingSpaces) {
            const spacesToRemove = leadingSpaces[1].length;
            const deleteFrom = parentPos + 1; // +1 to get inside the paragraph
            const deleteTo = deleteFrom + spacesToRemove;
            
            // Remove the leading spaces
            return editor.chain()
              .setTextSelection({ from: deleteFrom, to: deleteTo })
              .deleteSelection()
              .run();
          }

          // If no leading spaces, do nothing but consume the event
          return true;
        } catch (error) {
          console.warn('Error in Shift+Tab handler:', error);
          return true; // Consume the event even if there's an error
        }
      },
    };
  },
});