import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plugin } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

interface DateCreatedNodeProps {
  node: {
    attrs: {
      dateCreated: number;
    };
  };
}

const DateCreatedComponent: React.FC<DateCreatedNodeProps> = ({ node }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <NodeViewWrapper className="date-created-node">
      <div className="text-xs text-gray-500 mb-4 font-medium tracking-wide text-center">
        Created {formatDate(node.attrs.dateCreated)}
      </div>
    </NodeViewWrapper>
  );
};

export const DateCreatedNode = Node.create({
  name: 'dateCreated',
  
  group: 'block',
  
  atom: true,
  
  selectable: false,
  
  draggable: false,
  
  addAttributes() {
    return {
      dateCreated: {
        default: Date.now(),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="date-created"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'date-created' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateCreatedComponent);
  },


  addProseMirrorPlugins() {
    // Helper function to find the dateCreated node end position
    const findDateCreatedEnd = (doc: any): number | null => {
      let dateCreatedEnd: number | null = null;
      doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'dateCreated') {
          dateCreatedEnd = pos + node.nodeSize;
          return false; // Stop iteration
        }
      });
      return dateCreatedEnd;
    };

    // Helper function to move cursor to after dateCreated node
    const moveCursorAfterDateCreated = (view: any, dateCreatedEnd: number) => {
      const tr = view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(dateCreatedEnd))
      );
      view.dispatch(tr);
    };

    return [
      new Plugin({
        key: 'dateCreatedNodePlugin',
        props: {
          handleKeyDown: (view, event) => {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            const dateCreatedEnd = findDateCreatedEnd(state.doc);
            if (dateCreatedEnd === null) {
              return false;
            }
            
            // Prevent cursor movement that would land before or within the dateCreated node
            if (event.key === 'ArrowUp' || event.key === 'Home') {
              let shouldPrevent = false;
              
              if (event.key === 'Home') {
                // Home always tries to go to beginning of line/document
                shouldPrevent = true;
              } else if (event.key === 'ArrowUp') {
                // For ArrowUp, we need to predict where the cursor would land
                // ProseMirror's ArrowUp behavior:
                // 1. If there's a line above at the same column, go there
                // 2. If no line above, go to start of current line
                // 3. If already at start of first line, go to document start (position 0)
                
                // Get the resolved position to analyze the document structure
                const $pos = state.doc.resolve($from.pos);
                
                // Check if we're in the first text block after dateCreated
                // If the current position is in a paragraph directly after dateCreated,
                // ArrowUp would likely try to go to the dateCreated node or before it
                if ($pos.parent.type.name === 'paragraph') {
                  // Find the paragraph's position in the document
                  let paragraphStart = $pos.start();
                  
                  // If this paragraph starts right after dateCreated, ArrowUp would be problematic
                  if (paragraphStart <= dateCreatedEnd + 1) {
                    shouldPrevent = true;
                  }
                }
              }
              
              if (shouldPrevent) {
                event.preventDefault();
                moveCursorAfterDateCreated(view, dateCreatedEnd);
                return true;
              }
            }
            
            // Prevent backspace/delete that would affect the dateCreated node
            if ((event.key === 'Backspace' || event.key === 'Delete') && $from.pos <= dateCreatedEnd) {
              event.preventDefault();
              return true;
            }
            
            return false;
          },
          
          handleClick: (view, pos) => {
            const dateCreatedEnd = findDateCreatedEnd(view.state.doc);
            if (dateCreatedEnd === null) {
              return false;
            }
            
            // Prevent clicking before the end of dateCreated node
            if (pos < dateCreatedEnd) {
              moveCursorAfterDateCreated(view, dateCreatedEnd);
              return true;
            }
            
            return false;
          },
          
          beforeinput: (view, event) => {
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            const dateCreatedEnd = findDateCreatedEnd(state.doc);
            if (dateCreatedEnd === null) {
              return false;
            }
            
            // Prevent text input before the dateCreated node
            if ($from.pos < dateCreatedEnd) {
              event.preventDefault();
              moveCursorAfterDateCreated(view, dateCreatedEnd);
              return true;
            }
            
            return false;
          },
        }
      })
    ];
  },
});