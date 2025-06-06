import React, { Suspense, lazy } from 'react';
import { useRootStore } from '../../stores';
import { EditorInstance } from './EditorInstance';
import { TabletView } from '../Tab/TabletView';

interface EditorPaneWrapperProps {
  side: 'left' | 'right';
}

const LazyMarkdownPreview = lazy(() => import('../Preview/MarkdownPreview')
  .catch(err => {
    console.error("Failed to load MarkdownPreview component:", err);
    return { default: () => <div className="text-red-500 p-4">Error loading preview.</div> };
  })
);

const LazyHtmlPreview = lazy(() => import('../Preview/HtmlPreview')
  .catch(err => {
    console.error("Failed to load HtmlPreview component:", err);
    return { default: () => <div className="text-red-500 p-4">Error loading preview.</div> };
  })
);

const PreviewLoadingFallback = () => (
  <div className="text-gray-400 p-4 animate-pulse">Loading Preview...</div>
);

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
  const shouldShowHtmlPreview = previewMode && activeTab?.language === 'html';
  const shouldShowPreview = shouldShowMarkdownPreview || shouldShowHtmlPreview;

  return (
    // Main container for this pane
    <div
      data-editor-pane-side={side}
      className={`flex h-full w-full overflow-hidden ${shouldShowPreview ? 'flex-row' : 'flex-col'}`}
    >
      {/* Editor/Tablet Container */}
      <div
        className={`flex-1 overflow-hidden relative ${shouldShowPreview ? 'w-1/2' : 'w-full'} h-full`}
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

      {/* Preview Area (Conditional) */}
      {shouldShowPreview && activeTab && (
          <div className="w-1/2 h-full flex-1 flex flex-col overflow-hidden border-l border-gray-700">
            <div className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-gray-850" style={{ padding: shouldShowMarkdownPreview ? '1rem' : '0' }}>
              <Suspense fallback={<PreviewLoadingFallback />}>
                {shouldShowMarkdownPreview && (
                  <LazyMarkdownPreview content={activeTab.content} />
                )}
                {shouldShowHtmlPreview && (
                  <LazyHtmlPreview content={activeTab.content} />
                )}
              </Suspense>
            </div>
          </div>
        )}
    </div>
  );
};