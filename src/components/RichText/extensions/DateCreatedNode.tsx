import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { ReactNodeViewProps } from '@tiptap/react';

export const DateCreatedComponent: React.FC<ReactNodeViewProps> = ({ node }) => {
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
    // Constants for date created node detection
    const DATE_CREATED_SELECTORS = '[data-type="date-created"], [data-testid="rich-text-date-created"]';
    const DATE_CREATED_ATTRIBUTES = ['data-type="date-created"', 'data-testid="rich-text-date-created"'];

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
              const { $from, $to } = selection;
              
              const dateCreatedEnd = findDateCreatedEnd(state.doc);
              if (dateCreatedEnd === null) {
                return;
              }
              
              // Only fix cursor position if it's a cursor (not a selection)
              // Don't interfere with selections like Ctrl+A
              if ($from.pos === $to.pos && $from.pos < dateCreatedEnd) {
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
            
            // Allow Ctrl+A (Select All) to work properly
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
              return false; // Let the default Select All behavior work
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
            
            // Handle backspace/delete that might affect the dateCreated node
            if (event.key === 'Backspace' || event.key === 'Delete') {
              const { $to } = selection;

              // If this is a selection that includes content after the dateCreated node,
              // allow deletion of content after dateCreated while preserving the dateCreated node
              if ($from.pos < dateCreatedEnd && $to.pos > dateCreatedEnd) {
                event.preventDefault();

                // Delete only the content after the dateCreated node
                const tr = view.state.tr.delete(dateCreatedEnd, $to.pos);

                // Position cursor right after the dateCreated node
                const newSelection = TextSelection.near(tr.doc.resolve(dateCreatedEnd));
                tr.setSelection(newSelection);

                view.dispatch(tr);
                return true;
              }

              // If cursor/selection is entirely before dateCreated end, prevent deletion
              if ($from.pos < dateCreatedEnd && $to.pos <= dateCreatedEnd) {
                event.preventDefault();
                return true;
              }

              // If cursor is right at dateCreated end and this is backspace, prevent it
              if (event.key === 'Backspace' && $from.pos === dateCreatedEnd) {
                event.preventDefault();
                return true;
              }
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

          handlePaste: (view, event) => {
            // Filter out dateCreated nodes from pasted content
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const htmlData = clipboardData.getData('text/html');
            if (!htmlData) return false;

            // Check if the HTML contains a dateCreated node
            if (DATE_CREATED_ATTRIBUTES.some(attr => htmlData.includes(attr))) {
              // Create a temporary div to parse and filter the HTML
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = htmlData;
              
              // Remove all dateCreated nodes
              const dateCreatedNodes = tempDiv.querySelectorAll(DATE_CREATED_SELECTORS);
              dateCreatedNodes.forEach(node => node.remove());
              
              // Also remove parent div if it becomes empty
              dateCreatedNodes.forEach(node => {
                const parent = node.parentElement;
                if (parent && parent.children.length === 0 && parent.textContent?.trim() === '') {
                  parent.remove();
                }
              });

              // Get the filtered HTML
              const filteredHtml = tempDiv.innerHTML;
              
              if (filteredHtml.trim()) {
                // Create a new paste event with filtered content
                const newClipboardData = new DataTransfer();
                newClipboardData.setData('text/html', filteredHtml);
                
                const filteredEvent = new ClipboardEvent('paste', {
                  clipboardData: newClipboardData,
                  bubbles: true,
                  cancelable: true
                });
                
                // Prevent the original paste
                event.preventDefault();
                
                // Dispatch the filtered paste event
                view.dom.dispatchEvent(filteredEvent);
                return true;
              } else {
                // If filtering removed everything, prevent the paste
                event.preventDefault();
                return true;
              }
            }

            return false;
          },

          handleTextInput: (view, from, to, text) => {
            const dateCreatedEnd = findDateCreatedEnd(view.state.doc);
            if (dateCreatedEnd === null) {
              return false;
            }

            // If the text input range would delete the dateCreated node, prevent it
            if (from < dateCreatedEnd) {
              // Move the start position to after the dateCreated node
              const tr = view.state.tr.insertText(text, Math.max(from, dateCreatedEnd), to);
              view.dispatch(tr);
              return true;
            }

            return false;
          },

          handleDOMEvents: {
            beforeinput: (view, event) => {
              const dateCreatedEnd = findDateCreatedEnd(view.state.doc);
              if (dateCreatedEnd === null) {
                return false;
              }

              // Handle deletion input types that might affect the dateCreated node
              if (event.inputType === 'deleteContentBackward' ||
                  event.inputType === 'deleteContentForward' ||
                  event.inputType === 'deleteByCut' ||
                  event.inputType === 'deleteByDrag') {

                const { selection } = view.state;
                const { $from, $to } = selection;

                // If this is a selection that includes content after the dateCreated node,
                // allow deletion of content after dateCreated while preserving the dateCreated node
                if ($from.pos < dateCreatedEnd && $to.pos > dateCreatedEnd) {
                  event.preventDefault();

                  // Delete only the content after the dateCreated node
                  const tr = view.state.tr.delete(dateCreatedEnd, $to.pos);

                  // Position cursor right after the dateCreated node
                  const newSelection = TextSelection.near(tr.doc.resolve(dateCreatedEnd));
                  tr.setSelection(newSelection);

                  view.dispatch(tr);
                  return true;
                }

                // If deletion would affect the dateCreated node, prevent it
                if ($from.pos < dateCreatedEnd) {
                  event.preventDefault();
                  return true;
                }
              }

              // Handle text replacement that might affect the dateCreated node
              if (event.inputType === 'insertReplacementText' ||
                  event.inputType === 'insertText' ||
                  event.inputType === 'insertCompositionText') {
                
                const { selection } = view.state;
                const { $from, $to } = selection;
                
                // If the selection includes the dateCreated node, adjust the selection
                if ($from.pos < dateCreatedEnd) {
                  event.preventDefault();
                  
                  // Create a transaction that preserves the dateCreated node
                  const inputData = event.data || '';
                  const tr = view.state.tr;
                  
                  // Only replace content after the dateCreated node
                  const startPos = Math.max($from.pos, dateCreatedEnd);
                  const endPos = $to.pos;
                  
                  if (endPos > startPos) {
                    tr.replaceWith(startPos, endPos, view.state.schema.text(inputData));
                  } else {
                    tr.insertText(inputData, dateCreatedEnd);
                  }
                  
                  view.dispatch(tr);
                  return true;
                }
              }

              return false;
            }
          },
          
          // Text input protection is handled through event handlers above
        }
      })
    ];
  },
});