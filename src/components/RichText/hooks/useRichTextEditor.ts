import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { tiptapExtensions } from '../extensions';
import { useClipboardStore } from '../../../stores/clipboardStore';
import { autoMigrateDateCreatedNode } from '../utils/migrateDateCreatedNode';

export interface UseRichTextEditorProps {
  initialContent?: any;
  onUpdate: (content: any) => void;
  onTableContextMenu?: (event: MouseEvent) => void;
}

export const useRichTextEditor = ({
  initialContent,
  onUpdate,
  onTableContextMenu,
}: UseRichTextEditorProps) => {
  // Migrate legacy dateCreated nodes from old documents
  const migratedContent = initialContent ? autoMigrateDateCreatedNode(initialContent) : undefined;

  const editor = useEditor({
    // Use the centralized extensions array
    extensions: tiptapExtensions,
    content: migratedContent || {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    // Image insertion is handled in useEffect
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
                    // Image insertion failed - error is handled silently
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
  }, []);

  // Handle pending image data after editor is stable
  useEffect(() => {
    if (!editor) return;
    
    const { pendingImageData, pendingImageCursorOffset, setPendingImageData, setPendingImageCursorOffset } = useClipboardStore.getState();
    
    if (pendingImageData) {
      // Use setTimeout to ensure editor is fully ready
      setTimeout(() => {
        const { state, dispatch } = editor.view;
        const imageAttrs = { src: pendingImageData, alt: '', title: '' };
        let imageNode;
        
        if (state.schema.nodes.resizableImage) {
          imageNode = state.schema.nodes.resizableImage.create(imageAttrs);
        } else if (state.schema.nodes.image) {
          imageNode = state.schema.nodes.image.create(imageAttrs);
        } else {
          return;
        }
        
        try {
          let tr;
          if (pendingImageCursorOffset !== null) {
            // Insert at the calculated cursor position
            const doc = state.doc;
            let prosemirrorPosition = Math.min(pendingImageCursorOffset + 1, doc.content.size); // +1 to account for dateCreated node
            
            // Ensure position is valid and within bounds
            prosemirrorPosition = Math.max(1, Math.min(prosemirrorPosition, doc.content.size));
            
            tr = state.tr.insert(prosemirrorPosition, imageNode);
          } else {
            // Fallback to current selection if no cursor offset
            tr = state.tr.replaceSelectionWith(imageNode);
          }
          
          dispatch(tr);
          setPendingImageData(null);
          setPendingImageCursorOffset(null);
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }, 100);
    }
  }, [editor]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, []);

  return editor;
};