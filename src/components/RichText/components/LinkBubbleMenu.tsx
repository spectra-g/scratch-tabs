import React, { useState, useEffect, useRef } from 'react';
import { Edit3, ExternalLink, X } from '../../Icons';
import { LinkModal } from './LinkModal';

interface LinkBubbleMenuProps {
  editor: any; // TipTap editor instance
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateMenu = () => {
      const isLinkActive = editor.isActive('link');
      
      if (isLinkActive) {
        const selection = editor.state.selection;
        const { from, to } = selection;
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        
        // Position the menu above the link
        const rect = editor.view.dom.getBoundingClientRect();
        setPosition({
          top: start.top - rect.top - 50, // 50px above the link
          left: (start.left + end.left) / 2 - rect.left - 75, // Center horizontally, accounting for menu width
        });
        setShowMenu(true);
      } else {
        setShowMenu(false);
      }
    };

    // Update menu position on selection change
    const handleSelectionUpdate = () => {
      updateMenu();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('update', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('update', handleSelectionUpdate);
    };
  }, [editor]);

  if (!editor || !showMenu) return null;

  const handleEditLink = () => {
    const currentLink = editor.getAttributes('link');
    setCurrentLinkUrl(currentLink.href || '');
    setShowLinkModal(true);
  };

  const handleOpenLink = () => {
    const currentLink = editor.getAttributes('link');
    if (currentLink.href) {
      window.open(currentLink.href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const handleLinkSave = (url: string) => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkModal(false);
    setCurrentLinkUrl('');
  };

  const handleLinkCancel = () => {
    setShowLinkModal(false);
    setCurrentLinkUrl('');
  };

  return (
    <>
      <div
        ref={menuRef}
        className="absolute z-30 flex items-center bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={handleEditLink}
          className="px-3 py-2 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title="Edit Link"
        >
          <Edit3 size={14} />
        </button>
        
        <div className="w-px h-6 bg-gray-600" />
        
        <button
          onClick={handleOpenLink}
          className="px-3 py-2 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title="Open Link"
        >
          <ExternalLink size={14} />
        </button>
        
        <div className="w-px h-6 bg-gray-600" />
        
        <button
          onClick={handleUnlink}
          className="px-3 py-2 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
          title="Remove Link"
        >
          <X size={14} />
        </button>
      </div>

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onSave={handleLinkSave}
        onCancel={handleLinkCancel}
        initialUrl={currentLinkUrl}
      />
    </>
  );
};