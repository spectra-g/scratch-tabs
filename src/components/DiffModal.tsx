import React, { useCallback } from 'react';
import { useRootStore } from '../stores';
import { useTabsStore } from '../stores/tabsStore';
import { useDiffEditor } from './DiffModal/useDiffEditor';
import { DiffModalUI } from './DiffModal/DiffModalUI';

interface DiffModalProps {
  leftTabId: string;
  rightTabId: string;
  onClose: () => void; // The function passed from parent to close the modal
  fromHistory?: boolean;
}

export const DiffModal: React.FC<DiffModalProps> = ({ leftTabId, rightTabId, onClose, fromHistory = false }) => {
  console.time('[DiffModal] Component render');
  console.log('[DiffModal] Rendering with leftTabId:', leftTabId, 'rightTabId:', rightTabId);
  const { tabs } = useTabsStore();
  const { updateTabContent } = useRootStore();
  console.timeEnd('[DiffModal] Component render');

  const leftTab = tabs.find(tab => tab.id === leftTabId);
  const rightTab = tabs.find(tab => tab.id === rightTabId);

  const engine = useDiffEditor(
    leftTab?.content || '',
    rightTab?.content || '',
    leftTab?.language || 'plaintext',
    leftTabId,
    rightTabId
  );

  // Close and Save Handler
  const handleCloseAndSave = useCallback(() => {
    // Force record any pending debounced changes
    engine.forceRecordChange();

    // Get final content from the current history state
    const finalState = engine.changeHistory[engine.currentHistoryIndex];
    const finalLeftContent = finalState?.leftContent ?? engine.getCurrentLeftContent();
    const finalRightContent = finalState?.rightContent ?? engine.getCurrentRightContent();

    // Check if tabs and content exist and if content actually changed from original tab state
    if (leftTab && finalLeftContent !== undefined && leftTab.content !== finalLeftContent) {
      updateTabContent(leftTabId, finalLeftContent);
    }

    if (rightTab && finalRightContent !== undefined && rightTab.content !== finalRightContent) {
      updateTabContent(rightTabId, finalRightContent);
    }

    // Call the original onClose handler passed from the parent
    onClose();
  }, [leftTab, rightTab, leftTabId, rightTabId, updateTabContent, onClose, engine]);

  if (!leftTab || !rightTab) {
    return null;
  }

  return (
    <DiffModalUI 
      leftTabTitle={leftTab.title}
      rightTabTitle={rightTab.title}
      engine={engine}
      onClose={handleCloseAndSave}
    />
  );
};