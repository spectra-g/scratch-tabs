import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Table,
  Code,
  Link,
  Quote
} from '../../Icons';

interface RichTextToolbarProps {
  editor: any; // TipTap editor instance
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editor }) => {
  if (!editor) return null;

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
    <BubbleMenu
      editor={editor}
      tippyOptions={{ 
        duration: 100,
        placement: 'top',
        theme: 'dark',
      }}
      className="flex items-center space-x-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-1"
    >
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
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <Link size={16} />
      </ToolbarButton>
    </BubbleMenu>
  );
};