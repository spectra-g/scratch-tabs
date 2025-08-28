import { Extension } from '@tiptap/core';

/**
 * Extension to provide a smarter code block toggle that preserves syntax highlighting
 * and handles language detection properly
 */
export const SmartCodeBlockToggle = Extension.create({
  name: 'smartCodeBlockToggle',
  
  addStorage() {
    return {
      lastLanguage: 'javascript'
    };
  },

  addCommands() {
    return {
      toggleCodeBlockSmart: (attributes?: { language?: string }) => ({ editor, chain }: any) => {

        // If we're currently in a code block, get its current attributes
        if (editor.isActive('codeBlock')) {

          // Get the current code block's language if it exists
          const currentAttrs = editor.getAttributes('codeBlock');

          // Store the current language for potential reuse
          if (currentAttrs.language) {
            this.storage.lastLanguage = currentAttrs.language;
          }
          
          // Toggle off the code block first
          const toggleResult = chain().focus().toggleCodeBlock().run();

          // If we're not providing specific attributes, we're done (just turning it off)
          if (!attributes) {
            return true;
          }
          
          // If we're re-enabling, use the provided language or preserve the current one
          const language = attributes.language || currentAttrs.language || 'javascript';
          const reEnableResult = chain().focus().toggleCodeBlock({ language }).run();
          return reEnableResult;
        } else {

          // We're not in a code block, so create one
          // If no language provided, try to use the last stored language
          const language = attributes?.language || this.storage.lastLanguage || 'javascript';
          const createResult = chain().focus().toggleCodeBlock({ language }).run();

          return createResult;
        }
      },
      
      refreshCodeBlockHighlighting: () => ({ editor, tr, state }: any) => {
        // Force a re-highlighting of the current code block
        if (editor.isActive('codeBlock')) {
          const currentAttrs = editor.getAttributes('codeBlock');
          const language = currentAttrs.language;
          
          if (language) {
            // Get the current selection
            const { from } = state.selection;
            
            // Find the code block node
            const resolvedFrom = state.doc.resolve(from);
            const codeBlockPos = resolvedFrom.start() - 1;
            
            // Set attributes to trigger re-highlighting
            tr.setNodeMarkup(codeBlockPos, undefined, { language });
            return true;
          }
        }
        return false;
      }
    } as any;
  },
});