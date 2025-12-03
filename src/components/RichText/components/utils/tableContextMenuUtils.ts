import { Editor } from '@tiptap/react';
import { DOMSerializer } from 'prosemirror-model';

export const SHORTCUTS = {
  ADD_ROW_ABOVE: 'Ctrl+Option+↑',
  ADD_ROW_BELOW: 'Ctrl+Option+↓',
  ADD_COLUMN_LEFT: 'Ctrl+Option+←',
  ADD_COLUMN_RIGHT: 'Ctrl+Option+→',
} as const;

export const MENU_STYLES = {
  MIN_WIDTH: '200px',
  Z_INDEX: 50,
} as const;

export const detectOS = (): 'mac' | 'windows' => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'mac' : 'windows';
};

export const getOSShortcutText = (baseShortcut: string): string => {
  const isMac = detectOS() === 'mac';
  if (isMac) {
    return baseShortcut.replace('Ctrl+', '⌃').replace('Option+', '⌥');
  } else {
    return baseShortcut.replace('Option+', 'Alt+');
  }
};

export const isInTableHeader = (editor: Editor): boolean => {
  return editor.isActive('tableHeader');
};

export const isOnlyTableRow = (editor: Editor): boolean => {
  try {
    const { state } = editor;
    const { $from } = state.selection;

    // Find the table node
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === 'table') {
        // Count rows (including header)
        let rowCount = 0;
        node.descendants((child) => {
          if (child.type.name === 'tableRow') {
            rowCount++;
          }
        });
        return rowCount <= 1;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const getTableContextFromEditor = (editor: Editor) => {
  return {
    isInHeader: isInTableHeader(editor),
    isOnlyRow: isOnlyTableRow(editor),
  };
};

export const copyTableToClipboard = (editor: Editor): void => {
  const { state } = editor.view;
  const { selection } = state;
  const { $from } = selection;

  // Find the table node
  let tableNode = null;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      tableNode = node;
      break;
    }
  }

  if (tableNode) {
    // Serialize the table node to HTML
    // We need to dynamically import DOMSerializer or pass it in, but since this is a utility file
    // we can assume prosemirror-model is available.
    // However, to avoid circular dependencies or complex imports, we'll import it at the top.
    // Note: We need to add the import to the top of the file.

    // For now, let's assume the caller handles the serialization or we move the logic here.
    // Actually, let's move the whole logic here including the DOM manipulation.

    try {
      // We need access to the schema to serialize
      // @ts-ignore - DOMSerializer is not imported yet, we will add it
      const serializer = DOMSerializer.fromSchema(state.schema);
      const dom = serializer.serializeNode(tableNode);
      const tmp = document.createElement('div');
      tmp.appendChild(dom);

      // Create a temporary container for copying
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.innerHTML = tmp.innerHTML;
      document.body.appendChild(container);

      // Select the content
      const range = document.createRange();
      range.selectNodeContents(container);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);

        try {
          // Execute copy
          document.execCommand('copy');
        } catch (err) {
          console.error('Failed to copy table:', err);
        }

        // Cleanup
        sel.removeAllRanges();
      }

      document.body.removeChild(container);

      // Restore editor focus/selection if needed
      editor.view.focus();
    } catch (error) {
      console.error('Error copying table:', error);
    }
  }
};