import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

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
      <div className="text-xs text-gray-500 mb-4 font-medium tracking-wide">
        Created {formatDate(node.attrs.dateCreated)}
      </div>
    </NodeViewWrapper>
  );
};

export const DateCreatedNode = Node.create({
  name: 'dateCreated',
  
  group: 'block',
  
  atom: true,
  
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
});