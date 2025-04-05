import React from 'react';
import { useRootStore } from '../../stores';
import { EditorInstance } from './EditorInstance';
import { TabletView } from '../Tab/TabletView';
import { MarkdownPreview } from '../Preview/MarkdownPreview';

interface EditorPaneWrapperProps {
  side: 'left' | 'right';
}

export const EditorPaneWrapper: React.FC<EditorPaneWrapperProps> = ({side}) => {
  const {
    tabs,
    previewMode,
    splitView,
    updateTabState
  } = useRootStore();

  const activeTabId = side === 'left' ? splitView.activeLeftTabId : splitView.activeRightTabId;
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleTabletStateChange = (newState: string) => {
    if (!activeTabId) return;
    updateTabState(activeTabId, {tabletState: newState});
  };

  const shouldShowMarkdownPreview = previewMode && activeTab?.language === 'markdown';

  return (
    // Main container for this pane
    <div className={`flex h-full w-full overflow-hidden ${shouldShowMarkdownPreview ? 'flex-row' : 'flex-col'}`}>
      {/* Editor/Tablet Container */}
      <div
        className={`flex-1 overflow-hidden relative ${shouldShowMarkdownPreview ? 'w-1/2' : 'w-full'} h-full`}
      >
        {activeTab ? (
          activeTab.isTablet ? (
            <TabletView
              tab={activeTab}
              onChange={handleTabletStateChange}
            />
          ) : (
            // EditorInstance now renders its own StatusBar internally
            <EditorInstance
              side={side}
              activeTab={activeTab}
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No tab selected</p>
          </div>
        )}
      </div>

      {/* Markdown Preview Area (Conditional) */}
      {shouldShowMarkdownPreview && activeTab && (
        <div className="w-1/2 h-full flex-1 flex flex-col overflow-hidden border-l border-gray-700">
          <div className="flex-1 w-full h-full overflow-auto p-4 custom-scrollbar bg-gray-850">
            <MarkdownPreview content={activeTab.content}/>
          </div>
        </div>
      )}
    </div>
  );
};