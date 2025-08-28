import { Editor } from '@tiptap/react';

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