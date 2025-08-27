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
  Download
} from '../../Icons';
import { LinkModal } from './LinkModal';
import { extractLinkTextForEditing } from '../utils/linkTextExtraction';
import { getNextBackgroundTexture, getBackgroundConfig } from '../utils/backgroundTextureUtils';
import { useRootStore } from '../../../stores/rootStore';
import { Tab, BackgroundTexture, RichContent } from '../../../types';

interface RichTextToolbarProps {
  editor: any; // TipTap editor instance
  activeTab: Tab;
  onImportCode?: () => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editor, activeTab, onImportCode }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');
  const [currentLinkText, setCurrentLinkText] = useState('');
  const [lastSelection, setLastSelection] = useState<{from: number, to: number} | null>(null);
  const [, forceUpdate] = useState({});
  const { updateTabState } = useRootStore();

  // Force re-render when editor selection changes to update table controls
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      // Store the current selection if it's not empty
      const { from, to } = editor.state.selection;
      if (from !== to) {
        setLastSelection({ from, to });
      }
      
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
      
      const result = extractLinkTextForEditing(editor, currentLink.href);
      setCurrentLinkText(result.text);
      setShowLinkModal(true);
      return;
    } else {
      setCurrentLinkUrl('');
    }
    
    // Get the current selected text for the link text field
    const { from, to } = editor.state.selection;
    let selectedText = editor.state.doc.textBetween(from, to);
    
    // If no text is selected, try to select the word at cursor position
    if (!selectedText) {
      // Try to use the last stored selection first
      if (lastSelection) {
        selectedText = editor.state.doc.textBetween(lastSelection.from, lastSelection.to);
      } else {
        // If no stored selection, try to expand selection around the cursor to get the word
        try {
          const { state } = editor;
          const { $from } = state.selection;
          
          // Find word boundaries around the cursor
          const textNode = $from.parent;
          const offset = $from.parentOffset;
          const text = textNode.textContent || '';
          
          if (text) {
            // Find the start and end of the word at cursor position
            let start = offset;
            let end = offset;
            
            // Move start backward to find word start
            while (start > 0 && /\w/.test(text[start - 1])) {
              start--;
            }
            
            // Move end forward to find word end  
            while (end < text.length && /\w/.test(text[end])) {
              end++;
            }
            
            if (start < end) {
              // We found a word, get the text
              selectedText = text.substring(start, end);
              
              // Store this as our selection for later use
              const wordStart = $from.pos - offset + start;
              const wordEnd = $from.pos - offset + end;
              setLastSelection({ from: wordStart, to: wordEnd });
            }
          }
        } catch (error) {
          console.error('Error expanding selection to word:', error);
        }
      }
    }
    
    setCurrentLinkText(selectedText || '');
    setShowLinkModal(true);
  };

  const handleLinkSave = (url: string, text?: string) => {
    if (url) {
      if (text) {
        // If text is provided, we need to handle different scenarios
        const { from, to } = editor.state.selection;
        
        if (lastSelection) {
          // We have a stored selection from when the user clicked on a word - use it
          editor.chain()
            .focus()
            .setTextSelection({ from: lastSelection.from, to: lastSelection.to })
            .deleteSelection()
            .insertContent(text)
            .setTextSelection({ from: lastSelection.from, to: lastSelection.from + text.length })
            .setLink({ href: url })
            .run();
        } else if (from !== to) {
          // There's an active selection - use it
          editor.chain().focus().deleteSelection().insertContent(text).setLink({ href: url }).run();
        } else {
          // No selection and no stored selection - just insert at cursor
          editor.chain().focus().insertContent(text).setTextSelection({ from: from, to: from + text.length }).setLink({ href: url }).run();
        }
      } else {
        // If no text provided, just update the URL (for existing links)
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    setShowLinkModal(false);
    setCurrentLinkUrl('');
    setCurrentLinkText('');
    setLastSelection(null); // Clear stored selection after use
  };

  const handleLinkCancel = () => {
    setShowLinkModal(false);
    setCurrentLinkUrl('');
    setCurrentLinkText('');
    setLastSelection(null); // Clear stored selection on cancel
  };

  const handleBackgroundChange = (texture: BackgroundTexture) => {
    // Update richContent.attrs.backgroundTexture instead of top-level property
    const currentRichContent = activeTab.richContent as RichContent;
    const updatedRichContent: RichContent = {
      ...currentRichContent,
      attrs: {
        ...currentRichContent?.attrs,
        backgroundTexture: texture
      }
    };
    updateTabState(activeTab.id, { richContent: updatedRichContent });
  };

  const handleBackgroundCycle = () => {
    const currentTexture = activeTab.richContent?.attrs?.backgroundTexture;
    const nextTexture = getNextBackgroundTexture(currentTexture);
    handleBackgroundChange(nextTexture);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    title: string;
    children: React.ReactNode;
    testId?: string;
  }> = ({ onClick, isActive = false, title, children, testId }) => (
    <button
      onClick={onClick}
      title={title}
      data-testid={testId}
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
        testId="rich-text-bold"
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
        testId="rich-text-italic"
      >
        <Italic size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
        testId="rich-text-code"
      >
        <Code size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="Code Block"
        testId="rich-text-code-block"
      >
        <FileCode size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
        testId="rich-text-bullet-list"
      >
        <List size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
        testId="rich-text-ordered-list"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
        testId="rich-text-blockquote"
      >
        <Quote size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        isActive={false}
        title="Insert Table"
        testId="rich-text-table"
      >
        <Table size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive('link')}
        title="Add Link"
        testId="rich-text-link"
      >
        <Link size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {onImportCode && (
        <ToolbarButton
          onClick={onImportCode}
          isActive={false}
          title="Import Code from Tab"
          testId="rich-text-import-code"
        >
          <Download size={16} />
        </ToolbarButton>
      )}

      <ToolbarButton
        onClick={handleBackgroundCycle}
        isActive={false}
        title={getBackgroundConfig(activeTab.richContent?.attrs?.backgroundTexture).title}
        testId="rich-text-background"
      >
        {getBackgroundConfig(activeTab.richContent?.attrs?.backgroundTexture).icon}
      </ToolbarButton>

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onSave={handleLinkSave}
        onCancel={handleLinkCancel}
        initialUrl={currentLinkUrl}
        initialText={currentLinkText}
      />
    </div>
  );
};