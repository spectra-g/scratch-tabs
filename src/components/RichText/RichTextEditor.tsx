import React, { useState, useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { useRichTextEditor } from './hooks/useRichTextEditor';
import { useImagePasteDetection } from './hooks/useImagePasteDetection';
import { RichTextToolbar } from './components/RichTextToolbar';
import { EditorSearchBar } from './components/EditorSearchBar';
import { UpgradeConfirmationModal } from './components/UpgradeConfirmationModal';
import { ImportCodeModal } from './components/ImportCodeModal';
import { Tab } from '../../types';
import { Search } from '../Icons';

interface RichTextEditorProps {
  tab: Tab;
  onContentChange: (richContent: any) => void;
  onUpgradeToRich?: () => void;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  tab,
  onContentChange,
  onUpgradeToRich,
  className = '',
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useRichTextEditor({
    initialContent: tab.richContent,
    onUpdate: onContentChange,
    dateCreated: tab.dateCreated,
  });

  const { handlePaste } = useImagePasteDetection({
    onImagePasted: () => {
      if (!tab.isRich && onUpgradeToRich) {
        setShowUpgradeModal(true);
      }
    },
    isRichMode: tab.isRich,
  });

  // Set up paste event listener for image detection in plain text mode
  useEffect(() => {
    if (!tab.isRich && editorContainerRef.current) {
      const container = editorContainerRef.current;
      container.addEventListener('paste', handlePaste);
      
      return () => {
        container.removeEventListener('paste', handlePaste);
      };
    }
  }, [handlePaste, tab.isRich]);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchBar(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpgradeConfirm = () => {
    setShowUpgradeModal(false);
    if (onUpgradeToRich) {
      onUpgradeToRich();
    }
  };

  const handleUpgradeCancel = () => {
    setShowUpgradeModal(false);
  };

  const getBackgroundTextureClass = () => {
    switch (tab.backgroundTexture) {
      case 'paper':
        return 'texture-paper';
      case 'grid':
        return 'texture-grid';
      default:
        return '';
    }
  };

  return (
    <>
      <div 
        ref={editorContainerRef}
        className={`rich-text-editor h-full w-full flex flex-col ${className}`}
      >
        {/* Search Bar */}
        {showSearchBar && (
          <div className="flex-shrink-0 p-4 border-b border-gray-700">
            <EditorSearchBar
              editor={editor}
              isVisible={showSearchBar}
              onClose={() => setShowSearchBar(false)}
            />
          </div>
        )}

        {/* Search Toggle Button */}
        {!showSearchBar && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowSearchBar(true)}
              className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md transition-colors"
              title="Search (Ctrl+F)"
            >
              <Search size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Editor Container */}
        <div 
          className={`flex-1 overflow-y-auto ${getBackgroundTextureClass()}`}
          style={{ minHeight: '100%' }}
        >
          <EditorContent 
            editor={editor} 
            className="h-full"
          />
        </div>

        {/* Floating Toolbar */}
        <RichTextToolbar editor={editor} />

        {/* Upgrade Confirmation Modal */}
        <UpgradeConfirmationModal
          isOpen={showUpgradeModal}
          onConfirm={handleUpgradeConfirm}
          onCancel={handleUpgradeCancel}
        />
      </div>

      {/* Import Code Modal */}
      <ImportCodeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        targetTabId={tab.id}
        editor={editor}
      />
    </>
  );
};