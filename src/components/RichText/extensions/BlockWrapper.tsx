import React, { useState, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { BlockContextMenu } from '../components/BlockContextMenu';

interface BlockWrapperProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  editor: any;
}

export const BlockWrapper: React.FC<BlockWrapperProps> = ({
  node,
  updateAttributes,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 100,
      y: rect.top,
    });
    setShowContextMenu(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay to prevent flickering when moving to the menu
    setTimeout(() => {
      if (!wrapperRef.current?.matches(':hover')) {
        setShowContextMenu(false);
      }
    }, 100);
  };

  const handleBlurContent = () => {
    updateAttributes({ isBlurred: !node.attrs.isBlurred });
    setShowContextMenu(false);
  };

  const handleImportCode = () => {
    // This would trigger a modal to select content from other tabs
    // For now, we'll just close the menu
    setShowContextMenu(false);
  };

  const isBlurred = node.attrs.isBlurred || false;

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`block-wrapper relative group ${isBlurred ? 'blurred-content' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <NodeViewContent />
      
      {showContextMenu && (
        <BlockContextMenu
          onBlurContent={handleBlurContent}
          onImportCode={handleImportCode}
          position={menuPosition}
          visible={showContextMenu}
        />
      )}
    </NodeViewWrapper>
  );
};