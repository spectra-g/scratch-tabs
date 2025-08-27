import React, { Suspense, lazy, useMemo, useCallback } from "react";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { EditorInstance } from "./EditorInstance";
import { TabletView } from "../Tab/TabletView";
import { smartViewRegistry } from "../../views/registry";
import { StatusBar } from "../StatusBar";
import { useMarkdownPreviewResizer } from "../../hooks/useMarkdownPreviewResizer";
import { PreviewDivider } from "../Preview/PreviewDivider";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { modelManager } from "../../services/modelManager";
import { migrateTextToRich } from "../RichText/utils/contentMigration";
import { useClipboardStore } from "../../stores/clipboardStore";

// Lazy load the RichTextEditor component
const RichTextEditor = lazy(() => import("../RichText/RichTextEditor").then(module => ({ default: module.RichTextEditor })));

interface EditorPaneWrapperProps {
  side: "left" | "right";
}

const PreviewLoadingFallback = () => (
  <div className="text-gray-400 p-4 animate-pulse">Loading Preview...</div>
);

const RichTextLoadingFallback = () => (
  <div className="h-full flex items-center justify-center text-gray-400">
    <div className="text-center">
      <div className="animate-pulse">Loading Editor...</div>
    </div>
  </div>
);

// Full content accessor for preview components (removing large content guard)
const getContentForPreview = (tab: any): string => {
  if (!tab?.content) return "";
  return tab.content;
};

export const EditorPaneWrapper: React.FC<EditorPaneWrapperProps> = ({
  side,
}) => {

  // FIX: Use useStoreWithEqualityFn with shallow comparison to prevent unnecessary re-renders
  const activeTabId = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) =>
      side === "left"
        ? state.splitView.activeLeftTabId
        : state.splitView.activeRightTabId,
    shallow,
  );

  // Get actions from rootStore
  const { updateTabState, getActiveView } = useRootStore.getState();

  // FIX: Use useStoreWithEqualityFn with proper equality check
  const activeTab = useStoreWithEqualityFn(
    useTabsStore,
    (state) => {
      const tab = state.tabs.find((t) => t.id === activeTabId);
      return tab || null;
    },
    (prev, next) => {
      // Custom equality check - only re-render if the tab actually changed
      if (!prev && !next) return true;
      if (!prev || !next) return false;
      return (
        prev.id === next.id &&
        prev.content === next.content &&
        prev.richContent === next.richContent &&
        prev.isRich === next.isRich &&
        prev.backgroundTexture === next.backgroundTexture &&
        prev.language === next.language &&
        prev.title === next.title &&
        prev.isTablet === next.isTablet &&
        prev.activeViewId === next.activeViewId &&
        prev.tabletState === next.tabletState
      );
    },
  );

  // Memoize content for preview components to avoid expensive re-renders
  const previewContent = useMemo(() => {
    return getContentForPreview(activeTab);
  }, [activeTab?.id, activeTab?.content]);

  const handleTabletStateChange = (newState: string) => {
    if (!activeTabId) return;
    updateTabState(activeTabId, { tabletState: newState });
  };

  const handleRichContentChange = (richContent: any) => {
    if (!activeTabId) return;
    updateTabState(activeTabId, { 
      richContent,
      lastModified: Date.now(),
    });
  };

  const handleUpgradeToRich = useCallback(() => {
    if (!activeTab || !activeTabId) return;
    
    // Check if there's pending image data and cursor position
    const { pendingImageData, pendingImageCursorPosition, setPendingImageCursorOffset } = useClipboardStore.getState();
    
    // Migrate existing plain text content to rich format, including cursor position mapping
    const migration = migrateTextToRich(
      activeTab.content || '',
      activeTab.dateCreated,
      pendingImageCursorPosition || undefined
    );
    const { richContent, cursorOffset } = migration;
    
    // Store the calculated cursor offset for the rich text editor
    if (cursorOffset !== undefined) {
      setPendingImageCursorOffset(cursorOffset);
    }
    
    updateTabState(activeTabId, {
      isRich: true,
      richContent,
      lastModified: Date.now(),
    });
  }, [activeTab, activeTabId, updateTabState]);
  // This logic is now safe because it depends on `activeTab` which is subscribed to granularly
  const activeViewId = activeTab ? getActiveView(activeTab.id) : null;
  const extendedView =
    activeTab && activeViewId
      ? smartViewRegistry.getView(activeTab.language, activeViewId)
      : null;

  // Determine if we should show a side-by-side preview based on the view mode
  const shouldShowSideBySidePreview = extendedView?.mode === 'side-by-side';
  const shouldShowReplacementView = extendedView?.mode === 'replaces';

  // Use the markdown preview resizer hook for side-by-side views
  const { containerRef, editorStyle, previewStyle, dividerProps, isDragging } =
    useMarkdownPreviewResizer(!!shouldShowSideBySidePreview);


  return (
    // Main container for this pane
    <div
      ref={containerRef}
      data-editor-pane-side={side}
      className={`flex h-full w-full overflow-hidden ${shouldShowSideBySidePreview ? "flex-row" : "flex-col"}`}
    >
      {/* Editor/Tablet/Extended View Container */}
      <div
        style={shouldShowSideBySidePreview ? editorStyle : undefined}
        className={`overflow-hidden relative ${shouldShowSideBySidePreview ? "" : "flex-1 w-full"} flex flex-col`}
      >
        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          {activeTab && activeTabId ? (
            shouldShowReplacementView ? (
              // Render replacement view (like CSV table editor)
              <extendedView.component
                content={previewContent}
                onContentChange={(newContent) => {
                  updateTabState(activeTab.id, { content: newContent });
                  // Invalidate the cached model so it gets recreated with fresh content
                  modelManager.invalidateModel(activeTab.id);
                }}
                tabId={activeTab.id}
                isActive={true}
                side={side}
              />
            ) : activeTab.isRich ? (
              // Render rich text editor with lazy loading
              <Suspense fallback={<RichTextLoadingFallback />}>
                <RichTextEditor
                  key={activeTab.id}
                  tab={activeTab}
                  onContentChange={handleRichContentChange}
                  onUpgradeToRich={handleUpgradeToRich}
                />
              </Suspense>
            ) : activeTab.isTablet ? (
              <TabletView tab={activeTab} onChange={handleTabletStateChange} />
            ) : (
              // Pass only the ID to EditorInstance
              <EditorInstance
                key={activeTab.id}
                side={side}
                activeTabId={activeTabId}
                onUpgradeToRich={handleUpgradeToRich}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>No tab selected</p>
            </div>
          )}
        </div>

        {/* Status Bar - Always visible */}
        {activeTab && (
          <div className="flex-shrink-0">
            <StatusBar
              activeTab={activeTab}
              side={side}
            />
          </div>
        )}
      </div>

      {/* Resizer Divider for side-by-side views */}
      {shouldShowSideBySidePreview && (
        <PreviewDivider
          dividerProps={dividerProps}
          isDragging={isDragging}
          isPreviewEnabled={!!shouldShowSideBySidePreview}
        />
      )}

      {/* Preview Area for side-by-side views */}
      {shouldShowSideBySidePreview && activeTab && extendedView && (
        <div
          data-testid="preview-pane"
          style={previewStyle}
          className="h-full flex flex-col overflow-hidden border-l border-gray-700"
        >
          <div
            className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-gray-850"
            style={{ padding: "1rem" }}
          >
            <Suspense fallback={<PreviewLoadingFallback />}>
              <extendedView.component
                content={previewContent}
                onContentChange={(newContent) => {
                  updateTabState(activeTab.id, { content: newContent });
                  // Invalidate the cached model so it gets recreated with fresh content
                  modelManager.invalidateModel(activeTab.id);
                }}
                tabId={activeTab.id}
                isActive={true}
                side={side}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};
