import React, { useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { ContextMenuItem } from '../../Tab/ContextMenuItem';
import { useTableMenuItems } from './hooks/useTableMenuItems';
import { useVisibleMenuItems } from './hooks/useVisibleMenuItems';
import { MENU_STYLES } from './utils/tableContextMenuUtils';

export interface Position {
  x: number;
  y: number;
}

interface TableContextMenuProps {
  editor: Editor;
  position: Position;
  onClose: () => void;
}


export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  editor,
  position,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, onClose);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const menuItems = useTableMenuItems({ editor, onAction: handleAction });
  const visibleItems = useVisibleMenuItems(menuItems);

  return (
    <div
      ref={menuRef}
      data-testid="table-context-menu"
      className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        minWidth: MENU_STYLES.MIN_WIDTH,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {visibleItems.map((item) => {
        if (item.isSeparator) {
          return (
            <div
              key={item.id}
              className="border-t border-gray-600 my-1 mx-1"
            />
          );
        }
        return <ContextMenuItem key={item.id} item={item} />;
      })}
    </div>
  );
};