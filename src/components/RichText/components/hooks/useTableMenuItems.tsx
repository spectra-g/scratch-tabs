import React from 'react';
import { Editor } from '@tiptap/react';
import { MenuItem } from '../../../Tab/types';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  Trash2,
} from '../../../Icons';
import { getOSShortcutText, SHORTCUTS, getTableContextFromEditor } from '../utils/tableContextMenuUtils';

export interface UseTableMenuItemsProps {
  editor: Editor;
  onAction: (action: () => void) => void;
}

export const useTableMenuItems = ({ editor, onAction }: UseTableMenuItemsProps): MenuItem[] => {
  const { isInHeader, isOnlyRow } = getTableContextFromEditor(editor);

  const baseMenuItems: MenuItem[] = [
    {
      id: 'addRowAbove',
      label: 'Add row above',
      icon: ArrowUp,
      action: () => onAction(() => (editor as any).chain().focus().addRowBefore().run()),
      condition: !isInHeader, // Can't add row above header
    },
    {
      id: 'addRowBelow',
      label: 'Add row below',
      icon: ArrowDown,
      action: () => onAction(() => (editor as any).chain().focus().addRowAfter().run()),
    },
    {
      id: 'separator1',
      isSeparator: true,
    },
    {
      id: 'addColumnLeft',
      label: 'Add column left',
      icon: ArrowLeft,
      action: () => onAction(() => (editor as any).chain().focus().addColumnBefore().run()),
    },
    {
      id: 'addColumnRight',
      label: 'Add column right',
      icon: ArrowRight,
      action: () => onAction(() => (editor as any).chain().focus().addColumnAfter().run()),
    },
    {
      id: 'separator2',
      isSeparator: true,
    },
    {
      id: 'deleteRow',
      label: 'Delete row',
      icon: Minus,
      action: () => onAction(() => (editor as any).chain().focus().deleteRow().run()),
      condition: !isInHeader && !isOnlyRow, // Can't delete header row or the only row
    },
    {
      id: 'deleteColumn',
      label: 'Delete column',
      icon: Minus,
      action: () => onAction(() => (editor as any).chain().focus().deleteColumn().run()),
    },
    {
      id: 'separator3',
      isSeparator: true,
    },
    {
      id: 'deleteTable',
      label: 'Delete table',
      icon: Trash2,
      action: () => onAction(() => (editor as any).chain().focus().deleteTable().run()),
    },
  ];

  // Add shortcuts to labels
  return baseMenuItems.map(item => {
    if (item.isSeparator) return item;
    
    const shortcutMap: Record<string, string> = {
      addRowAbove: SHORTCUTS.ADD_ROW_ABOVE,
      addRowBelow: SHORTCUTS.ADD_ROW_BELOW,
      addColumnLeft: SHORTCUTS.ADD_COLUMN_LEFT,
      addColumnRight: SHORTCUTS.ADD_COLUMN_RIGHT,
    };

    const baseShortcut = shortcutMap[item.id];
    if (!baseShortcut) return item;

    const shortcut = getOSShortcutText(baseShortcut);
    
    return {
      ...item,
      label: (
        <div className="flex justify-between items-center w-full">
          <span>{item.label as string}</span>
          <span className="text-gray-400 text-xs ml-4">{shortcut}</span>
        </div>
      ) as any
    };
  });
};