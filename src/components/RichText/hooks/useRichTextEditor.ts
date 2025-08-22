import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { tiptapExtensions } from '../extensions';

export interface UseRichTextEditorProps {
  initialContent?: any;
  onUpdate: (content: any) => void;
  dateCreated: number;
  onTableContextMenu?: (event: MouseEvent) => void;
}

export const useRichTextEditor = ({
  initialContent,
  onUpdate,
  dateCreated,
  onTableContextMenu,
}: UseRichTextEditorProps) => {
  const editor = useEditor({
    // MODIFIED: Use the centralized extensions array
    extensions: tiptapExtensions,
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated,
          },
        },
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full p-6',
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const src = e.target?.result as string;

                  // Use a timeout to ensure editor is available and use TipTap's chain API
                  // Don't use setTimeout - insert image directly using ProseMirror transaction
                  const { state, dispatch } = view;
                  const { selection } = state;
                  
                  try {
                    // Create image node using ProseMirror's low-level API
                    const imageAttrs = { src, alt: '', title: '' };

                    // Try different possible node names for the resizable image
                    let imageNode;
                    if (state.schema.nodes.resizableImage) {
                      imageNode = state.schema.nodes.resizableImage.create(imageAttrs);
                    } else if (state.schema.nodes.image) {
                      imageNode = state.schema.nodes.image.create(imageAttrs);
                    } else {
                      return;
                    }
                    
                    const tr = state.tr.replaceSelectionWith(imageNode);
                    dispatch(tr);
                  } catch (error) {
                    console.log('❌ Error inserting image:', error);
                  }
                };
                reader.readAsDataURL(file);
                return true; // Prevent default paste behavior
              }
            }
          }
        }
        return false; // Allow default paste behavior for other content
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          // Check if we're inside a table cell
          const { state } = view;
          const { $from } = state.selection;
          
          // Walk up the node hierarchy to see if we're in a table
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'table') {
              if (onTableContextMenu) {
                event.preventDefault();
                onTableContextMenu(event);
                return true;
              }
            }
          }
          return false;
        },
      },
    },
  }, [dateCreated]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  return editor;
};