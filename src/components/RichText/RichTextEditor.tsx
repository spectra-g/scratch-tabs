import React, { useState, useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import { useRichTextEditor } from './hooks/useRichTextEditor';
import { useTableKeyboardShortcuts } from './hooks/useTableKeyboardShortcuts';
import { RichTextToolbar } from './components/RichTextToolbar';
import { InlineSearchBar } from './components/InlineSearchBar';
import { LinkBubbleMenu } from './components/LinkBubbleMenu';
import { TableContextMenu, Position } from './components/TableContextMenu';
import { UpgradeConfirmationModal } from './components/UpgradeConfirmationModal';
import { ImportCodeModal } from './components/ImportCodeModal';
import { DateCreatedHeader } from './components/DateCreatedHeader';
import { Tab } from '../../types';
import { useClipboardStore } from '../../stores/clipboardStore';

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
  const [showTableContextMenu, setShowTableContextMenu] = useState(false);
  const [tableContextMenuPosition, setTableContextMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { pendingImageData, setPendingImageData } = useClipboardStore();

  const handleTableContextMenu = (event: MouseEvent) => {
    setTableContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowTableContextMenu(true);
  };

  const editor = useRichTextEditor({
    initialContent: tab.richContent,
    onUpdate: onContentChange,
    onTableContextMenu: handleTableContextMenu,
  });

  

  // Image paste detection is now handled in EditorInstance for plain text mode

  // Set up global keyboard shortcuts (search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchBar(true);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Set up table-specific keyboard shortcuts
  useTableKeyboardShortcuts({ editor });

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
    const backgroundTexture = tab.richContent?.attrs?.backgroundTexture;
    switch (backgroundTexture) {
      case 'lined':
        return 'texture-lined';
      case 'texture':
        return 'texture-texture';
      case 'dots':
        return 'texture-dots';
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
        className={`rich-text-editor h-full w-full flex flex-col relative ${getBackgroundTextureClass()} ${className}`}
      >
        {/* Inline Search Bar */}
        <InlineSearchBar
          editor={editor}
          isVisible={showSearchBar}
          onClose={() => setShowSearchBar(false)}
          onOpen={() => setShowSearchBar(true)}
        />

        {/* Toolbar - Conditional rendering */}
        <div className="flex-shrink-0 border-b border-gray-700 bg-gray-900 z-20">
          <RichTextToolbar
            editor={editor}
            activeTab={tab}
            onImportCode={() => setShowImportModal(true)}
          />
        </div>

        {/* Date Created Header - Outside of TipTap editor for simplicity */}
        <DateCreatedHeader dateCreated={tab.dateCreated} />

        {/* Editor Container - Content below toolbar (parent handles scrolling) */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{ minHeight: '0' }}
        >
          <EditorContent
            editor={editor}
            className="h-full"
          />

          {/* Link Bubble Menu */}
          <LinkBubbleMenu editor={editor} />
        </div>

        {/* Table Context Menu */}
        {showTableContextMenu && (
          <TableContextMenu
            editor={editor}
            position={tableContextMenuPosition}
            onClose={() => setShowTableContextMenu(false)}
          />
        )}

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