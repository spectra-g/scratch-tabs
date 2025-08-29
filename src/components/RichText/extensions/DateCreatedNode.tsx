import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';

const DateCreatedComponent: React.FC<ReactNodeViewProps> = ({ node }) => {
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
      <div 
        className="text-xs text-gray-500 mb-4 font-medium tracking-wide text-center"
        data-testid="rich-text-date-created"
      >
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
        key: new PluginKey('dateCreatedNodePlugin'),
        view: (view) => {
          return {
            update: (view, prevState) => {
              // Check cursor position after any state change and fix if needed
              const { state } = view;
              const { selection } = state;
              const { $from } = selection;
              
              const dateCreatedEnd = findDateCreatedEnd(state.doc);
              if (dateCreatedEnd === null) {
                return;
              }
              
              // If cursor ended up before dateCreated, move it to after dateCreated
              if ($from.pos < dateCreatedEnd) {
                setTimeout(() => {
                  moveCursorAfterDateCreated(view, dateCreatedEnd);
                }, 0);
              }
            }
          };
        },
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
            if (event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'ArrowLeft') {
              let shouldPrevent = false;
              
              if (event.key === 'Home') {
                // Home always tries to go to beginning of line/document
                shouldPrevent = true;
              } else if (event.key === 'ArrowLeft') {
                // ArrowLeft: prevent if cursor would move before dateCreated node
                if ($from.pos <= dateCreatedEnd + 1) {
                  shouldPrevent = true;
                }
              } else if (event.key === 'ArrowUp') {
                // ArrowUp: prevent if cursor is close enough to dateCreated that ArrowUp might go before it
                // This is more reliable than trying to predict ProseMirror's exact behavior
                if ($from.pos <= dateCreatedEnd + 10) { // Allow some buffer for content after dateCreated
                  shouldPrevent = true;
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
          
          // beforeinput handler removed due to type incompatibility
          // Text input protection is handled through other event handlers
        }
      })
    ];
  },
});