import React, { useState, useEffect, useRef } from 'react';
import { Edit3, ExternalLink, X } from '../../Icons';
import { LinkModal } from './LinkModal';
import { extractLinkTextForEditing } from '../utils/linkTextExtraction';

interface LinkBubbleMenuProps {
  editor: any; // TipTap editor instance
}

export const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [currentLinkText, setCurrentLinkText] = useState('');
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
        
        // Position the menu above the link using viewport coordinates
        setPosition({
          top: start.top - 45, // 45px above the link (accounts for menu height)
          left: (start.left + end.left) / 2 - 70, // Center horizontally (70px is approx half menu width)
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
    
    const result = extractLinkTextForEditing(editor, currentLink.href);
    setCurrentLinkText(result.text);
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

  const handleLinkSave = (url: string, text?: string) => {
    if (url) {
      if (text) {
        // We need to find and select the entire original link text before replacing it
        const currentLink = editor.getAttributes('link');
        
        // Get the original link text from HTML
        const html = editor.getHTML();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const links = tempDiv.querySelectorAll(`a[href="${currentLink.href}"]`);
        const originalLinkText = links.length > 0 ? links[0].textContent || '' : '';
        
        if (originalLinkText) {
          // Search for the original link text around the cursor position
          const { state } = editor;
          const { doc, selection } = state;
          const cursorPos = selection.from;
          
          // Search in a reasonable radius around cursor
          const searchRadius = 100;
          const searchStart = Math.max(0, cursorPos - searchRadius);
          const searchEnd = Math.min(doc.content.size, cursorPos + searchRadius);
          
          // Find the position of the original link text
          for (let pos = searchStart; pos <= searchEnd - originalLinkText.length; pos++) {
            const textAtPos = doc.textBetween(pos, pos + originalLinkText.length);
            if (textAtPos === originalLinkText) {
              // Verify this is actually the link by checking if any position has the link mark
              let isActualLink = false;
              for (let checkPos = pos; checkPos < pos + originalLinkText.length; checkPos++) {
                try {
                  const $pos = doc.resolve(checkPos);
                  const marks = $pos.marks();
                  if (marks.some(mark => mark.type.name === 'link' && mark.attrs.href === currentLink.href)) {
                    isActualLink = true;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              
              if (isActualLink) {
                // Found the actual link! Select it and replace it
                editor.chain()
                  .focus()
                  .setTextSelection({ from: pos, to: pos + originalLinkText.length })
                  .deleteSelection()
                  .insertContent(text)
                  .setTextSelection({ from: pos, to: pos + text.length })
                  .setLink({ href: url })
                  .run();
                
                setShowLinkModal(false);
                setCurrentLinkUrl('');
                setCurrentLinkText('');
                return;
              }
            }
          }
        }
        
        // Fallback: if we can't find the original link, just insert at cursor
        editor.chain()
          .focus()
          .insertContent(text)
          .setTextSelection({ from: editor.state.selection.from, to: editor.state.selection.from + text.length })
          .setLink({ href: url })
          .run();
          
      } else {
        // If no text provided, just update the URL of the existing link
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    setShowLinkModal(false);
    setCurrentLinkUrl('');
    setCurrentLinkText('');
  };

  const handleLinkCancel = () => {
    setShowLinkModal(false);
    setCurrentLinkUrl('');
    setCurrentLinkText('');
  };

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-[60] flex items-center bg-surface border border-base rounded-lg shadow-lg overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <button
          onClick={handleEditLink}
          className="px-3 py-2 hover:bg-element transition-colors text-secondary hover:text-white"
          title="Edit Link"
        >
          <Edit3 size={14} />
        </button>
        
        <div className="w-px h-6 bg-element" />
        
        <button
          onClick={handleOpenLink}
          className="px-3 py-2 hover:bg-element transition-colors text-secondary hover:text-white"
          title="Open Link"
        >
          <ExternalLink size={14} />
        </button>
        
        <div className="w-px h-6 bg-element" />
        
        <button
          onClick={handleUnlink}
          className="px-3 py-2 hover:bg-element transition-colors text-secondary hover:text-white"
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
        initialText={currentLinkText}
      />
    </>
  );
};