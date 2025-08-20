import { useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { detectOS, isInTableHeader } from '../components/utils/tableContextMenuUtils';

export interface UseTableKeyboardShortcutsProps {
  editor: Editor | null;
}

export const useTableKeyboardShortcuts = ({ editor }: UseTableKeyboardShortcutsProps) => {
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Table shortcuts - only work when inside a table
      // Mac: Ctrl+Option+Arrow, Windows: Ctrl+Alt+Arrow
      const isMac = detectOS() === 'mac';
      const modifierPressed = e.ctrlKey && e.altKey;
      
      if (!editor.isActive('table') || !modifierPressed) return;

      const isInHeader = isInTableHeader(editor);
      
      switch (e.key) {
        case 'ArrowUp':
          // Can't add row above header
          if (!isInHeader) {
            e.preventDefault();
            editor.chain().focus().addRowBefore().run();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          editor.chain().focus().addRowAfter().run();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          editor.chain().focus().addColumnBefore().run();
          break;
        case 'ArrowRight':
          e.preventDefault();
          editor.chain().focus().addColumnAfter().run();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);
};