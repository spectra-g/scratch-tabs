import React from 'react';
import { Extension } from '../Icons';
import { tabletMetadata } from '../../tablets/tabletMetadata';
import { Tab } from '../../types';
import { SubMenuItem } from './ContextMenuSubmenus';

interface OpenInSubmenuProps {
  tab: Tab;
  isRightSide: boolean;
  onClose: () => void;
  onOpenTabletModal: () => void;
}

export const OpenInSubmenu: React.FC<OpenInSubmenuProps> = ({
  tab,
  isRightSide,
  onClose,
  onOpenTabletModal,
}) => {
  // Get context-aware tablet actions
  const tabletActions = tabletMetadata
    .flatMap(meta => meta.getActionsForContext?.({
      source: 'editor-tab',
      tab,
      content: tab.content,
      side: isRightSide ? 'right' : 'left',
    }) || [])
    .filter(action => action !== null);

  const handleActionClick = (actionFn: () => void) => {
    try {
      actionFn();
    } catch (error) {
      console.error('[OpenInSubmenu] Error executing action:', error);
    }
    // Delay closing slightly to ensure the action executes before menu unmounts
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Show "Browse All" if no context-aware actions
  if (tabletActions.length === 0) {
    return (
      <div className="py-1">
        <SubMenuItem
          label="Browse All Tablets..."
          icon={Extension}
          onClick={onOpenTabletModal}
        />
      </div>
    );
  }

  return (
    <div className="py-1">
      {tabletActions.map((action, index) => (
        <SubMenuItem
          key={action.id || index}
          label={action.label}
          icon={action.icon}
          onClick={() => handleActionClick(action.action)}
        />
      ))}
      <div className="border-t border-base my-1"></div>
      <SubMenuItem
        label="Browse Tablets..."
        icon={Extension}
        onClick={onOpenTabletModal}
      />
    </div>
  );
};
