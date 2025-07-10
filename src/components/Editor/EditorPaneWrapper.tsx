import React, { Suspense, lazy, useMemo } from "react";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { EditorInstance } from "./EditorInstance";
import { TabletView } from "../Tab/TabletView";
import { extendedViewRegistry } from "../../views/registry";
import { StatusBar } from "../StatusBar";
import { useMarkdownPreviewResizer } from "../../hooks/useMarkdownPreviewResizer";
import { PreviewDivider } from "../Preview/PreviewDivider";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

interface EditorPaneWrapperProps {
  side: "left" | "right";
}

const LazyMarkdownPreview = lazy(() =>
  import("../Preview/MarkdownPreview").catch((err) => {
    console.error("Failed to load MarkdownPreview component:", err);
    return {
      default: () => (
        <div className="text-red-500 p-4">Error loading preview.</div>
      ),
    };
  }),
);

const LazyHtmlPreview = lazy(() =>
  import("../Preview/HtmlPreview").catch((err) => {
    console.error("Failed to load HtmlPreview component:", err);
    return {
      default: () => (
        <div className="text-red-500 p-4">Error loading preview.</div>
      ),
    };
  }),
);

const PreviewLoadingFallback = () => (
  <div className="text-gray-400 p-4 animate-pulse">Loading Preview...</div>
);

// Full content accessor for preview components (removing large content guard)
const getContentForPreview = (tab: any): string => {
  if (!tab?.content) return "";
  return tab.content;
};

export const EditorPaneWrapper: React.FC<EditorPaneWrapperProps> = ({
  side,
}) => {
  const [editorInstance, setEditorInstance] = React.useState<any>(null);

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
        prev.language === next.language &&
        prev.title === next.title &&
        prev.isTablet === next.isTablet &&
        prev.previewMode === next.previewMode &&
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

  // This logic is now safe because it depends on `activeTab` which is subscribed to granularly
  const activeViewId = activeTab ? getActiveView(activeTab.id) : null;
  const extendedView =
    activeTab && activeViewId
      ? extendedViewRegistry.getView(activeTab.language, activeViewId)
      : null;
  const shouldShowMarkdownPreview =
    activeTab?.previewMode && activeTab?.language === "markdown";
  const shouldShowHtmlPreview =
    activeTab?.previewMode && activeTab?.language === "html";
  const shouldShowPreview = shouldShowMarkdownPreview || shouldShowHtmlPreview;

  // Use the markdown preview resizer hook
  const { containerRef, editorStyle, previewStyle, dividerProps, isDragging } =
    useMarkdownPreviewResizer(!!shouldShowPreview);

  // Clear editor instance when switching to extended view or tablet
  React.useEffect(() => {
    if (extendedView || activeTab?.isTablet) {
      setEditorInstance(null);
    }
  }, [extendedView, activeTab?.isTablet]);

  return (
    // Main container for this pane
    <div
      ref={containerRef}
      data-editor-pane-side={side}
      className={`flex h-full w-full overflow-hidden ${shouldShowPreview ? "flex-row" : "flex-col"}`}
    >
      {/* Editor/Tablet/Extended View Container */}
      <div
        style={shouldShowPreview ? editorStyle : undefined}
        className={`overflow-hidden relative ${shouldShowPreview ? "" : "flex-1 w-full"} flex flex-col`}
      >
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab && activeTabId ? (
            extendedView ? (
              // Render extended view (like CSV table editor)
              <extendedView.component
                content={previewContent}
                onContentChange={(newContent) =>
                  updateTabState(activeTab.id, { content: newContent })
                }
                tabId={activeTab.id}
                isActive={true}
              />
            ) : activeTab.isTablet ? (
              <TabletView tab={activeTab} onChange={handleTabletStateChange} />
            ) : (
              // Pass only the ID to EditorInstance
              <EditorInstance
                key={activeTab.id}
                side={side}
                activeTabId={activeTabId}
                onEditorReady={setEditorInstance}
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
              editor={!extendedView ? editorInstance : null}
              activeTab={activeTab}
              side={side}
            />
          </div>
        )}
      </div>

      {/* Resizer Divider */}
      {shouldShowPreview && (
        <PreviewDivider
          dividerProps={dividerProps}
          isDragging={isDragging}
          isPreviewEnabled={!!shouldShowPreview}
        />
      )}

      {/* Preview Area (Conditional) */}
      {shouldShowPreview && activeTab && (
        <div
          style={previewStyle}
          className="h-full flex flex-col overflow-hidden border-l border-gray-700"
        >
          <div
            className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-gray-850"
            style={{ padding: shouldShowMarkdownPreview ? "1rem" : "0" }}
          >
            <Suspense fallback={<PreviewLoadingFallback />}>
              {shouldShowMarkdownPreview && (
                <LazyMarkdownPreview content={previewContent} />
              )}
              {shouldShowHtmlPreview && (
                <LazyHtmlPreview content={previewContent} />
              )}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};
