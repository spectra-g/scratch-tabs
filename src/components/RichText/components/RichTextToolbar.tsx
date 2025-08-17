import React, { useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Table,
  Code,
  FileCode,
  Link,
  Quote,
  Plus,
  Minus,
  Trash2
} from '../../Icons';
import { LinkModal } from './LinkModal';

interface RichTextToolbarProps {
  editor: any; // TipTap editor instance
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editor }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [, forceUpdate] = useState({});

  // Force re-render when editor selection changes to update table controls
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      forceUpdate({});
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  if (!editor) return null;

  const handleLinkClick = () => {
    // Check if we're inside a link
    const currentLink = editor.getAttributes('link');
    if (currentLink.href) {
      setCurrentLinkUrl(currentLink.href);
    } else {
      setCurrentLinkUrl('');
    }
    setShowLinkModal(true);
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

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, isActive = false, title, children }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center space-x-1 bg-gray-800 p-2">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <FileCode size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        isActive={false}
        title="Insert Table"
      >
        <Table size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <Link size={16} />
      </ToolbarButton>

      {/* Table Controls - Only show when inside a table */}
      {editor.isActive('table') && (
        <>
          <div className="w-px h-6 bg-gray-600 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            isActive={false}
            title="Add Column Before"
          >
            <Plus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            isActive={false}
            title="Add Column After"
          >
            <Plus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            isActive={false}
            title="Add Row Before"
          >
            <Plus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            isActive={false}
            title="Add Row After"
          >
            <Plus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            isActive={false}
            title="Delete Column"
          >
            <Minus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            isActive={false}
            title="Delete Row"
          >
            <Minus size={16} />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            isActive={false}
            title="Delete Table"
          >
            <Trash2 size={16} />
          </ToolbarButton>
        </>
      )}

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onSave={handleLinkSave}
        onCancel={handleLinkCancel}
        initialUrl={currentLinkUrl}
      />
    </div>
  );
};