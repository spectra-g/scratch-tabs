import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BlockWrapper } from './BlockWrapper';

export const BlockWrapperExtension = Node.create({
  name: 'blockWrapper',
  
  group: 'block',
  
  content: 'block+',
  
  addAttributes() {
    return {
      isBlurred: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-wrapper"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'block-wrapper' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockWrapper);
  },
});