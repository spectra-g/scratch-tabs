import React, { Suspense, useMemo, useCallback, useRef, useEffect } from "react";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { TabContentRenderer } from "./TabContentRenderer";
import { smartViewRegistry } from "../../views/registry";
import { StatusBar } from "../StatusBar";
import { useMarkdownPreviewResizer } from "../../hooks/useMarkdownPreviewResizer";
import { PreviewDivider } from "../Preview/PreviewDivider";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { modelManager } from "../../services/modelManager";
import { migrateTextToRich } from "../RichText/utils/contentMigration";
import { useClipboardStore } from "../../stores/clipboardStore";
import { BatchToolsModal } from "../BatchTools/BatchToolsModal";
import { PipelineEditorModal } from "../Pipeline/PipelineEditorModal";
import { usePipelineStore } from "../../stores/pipelineStore";
import { useSmartViewSync } from "../../hooks/useSmartViewSync";
import type * as Monaco from "monaco-editor";
import { FloatingMacroToolbar } from "../Macro/FloatingMacroToolbar";
import { useMacroEngine } from "../Macro/useMacroEngine";
import { useMacroStore } from "../../stores/macroStore";

interface EditorPaneWrapperProps {
  side: "left" | "right";
}

const PreviewLoadingFallback = () => (
  <div className="text-muted p-4 animate-pulse">Loading Preview...</div>
);

// Wrapper component for PipelineEditorModal that reads from the store
const PipelineModalWrapper: React.FC<{ onApply: (content: string) => void }> = ({ onApply }) => {
  const { isOpen, content, closeModal } = usePipelineStore();

  if (!isOpen) return null;

  return (
    <PipelineEditorModal
      initialContent={content}
      onApply={onApply}
      onClose={closeModal}
    />
  );
};

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
        prev.richContent?.attrs?.backgroundTexture === next.richContent?.attrs?.backgroundTexture &&
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
    const { pendingImageCursorPosition, setPendingImageCursorOffset } = useClipboardStore.getState();

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

  const handleBatchToolsApply = useCallback((content: string) => {
    if (!activeTabId) return;

    // Update tab content in store
    updateTabState(activeTabId, {
      content,
      lastModified: Date.now(),
    });

    // Update the model directly without disposing it (prevents blank editor)
    // The replaceModelContentWithUndo method preserves undo stack and updates the model in place
    modelManager.replaceModelContentWithUndo(activeTabId, content);
  }, [activeTabId, updateTabState]);
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

  // Refs for scroll and click sync
  const editorInstanceRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const handleEditorReady = useCallback((editor: Monaco.editor.IStandaloneCodeEditor | null) => {
    editorInstanceRef.current = editor;
  }, []);

  // Macro engine for this pane
  const macroEngine = useMacroEngine(editorInstanceRef.current);

  // Sync macro toolbar visibility from store
  const { forceShowToolbar, targetTabId, targetSide } = useMacroStore((state) => ({
    forceShowToolbar: state.forceShowToolbar,
    targetTabId: state.targetTabId,
    targetSide: state.targetSide,
  }), shallow);

  useEffect(() => {
    // Only set forceVisible if this is the correct tab AND side
    const isTarget = targetTabId === activeTabId && targetSide === side;
    macroEngine.setForceVisible(forceShowToolbar && isTarget);
  }, [forceShowToolbar, targetTabId, targetSide, activeTabId, side, macroEngine]);

  // Sync scroll and clicks between editor and preview
  useSmartViewSync({
    editor: editorInstanceRef.current,
    previewContainer: previewContainerRef.current,
    syncConfig: extendedView?.syncConfig,
    content: previewContent,
    enabled: shouldShowSideBySidePreview && !!activeTab,
  });

  return (
    // Main container for this pane
    <div
      ref={containerRef}
      data-editor-pane-side={side}
      className={`flex h-full w-full overflow-hidden relative ${shouldShowSideBySidePreview ? "flex-row" : "flex-col"}`}
    >
      {/* Editor/Tablet/Extended View Container */}
      <div
        style={shouldShowSideBySidePreview ? editorStyle : undefined}
        className={`overflow-hidden relative ${shouldShowSideBySidePreview ? "" : "flex-1 w-full"} flex flex-col`}
      >
        {/* Main Content Area */}
        <div className="flex-1 min-h-0">
          <TabContentRenderer
            activeTab={activeTab}
            activeTabId={activeTabId}
            side={side}
            previewContent={previewContent}
            shouldShowReplacementView={!!shouldShowReplacementView}
            extendedView={extendedView}
            updateTabState={updateTabState}
            onTabletStateChange={handleTabletStateChange}
            onRichContentChange={handleRichContentChange}
            onUpgradeToRich={handleUpgradeToRich}
            onEditorReady={handleEditorReady}
          />
        </div>

        {/* Status Bar - Always visible */}
        {activeTab && (
          <div className="flex-shrink-0">
            <StatusBar
              activeTab={activeTab}
              side={side}
              isInSmartView={shouldShowReplacementView}
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
          className="h-full flex flex-col overflow-hidden border-l border-base"
        >
          <div
            ref={previewContainerRef}
            className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-element"
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

      {/* BatchToolsModal - Always available regardless of view mode */}
      <BatchToolsModal onApply={handleBatchToolsApply} />

      {/* PipelineEditorModal - New pipeline-based transformations */}
      <PipelineModalWrapper onApply={handleBatchToolsApply} />

      {/* Floating Macro Toolbar - Shows when recording/playing for the correct tab/side */}
      {!activeTab?.isTablet && !activeTab?.isRich && forceShowToolbar && targetTabId === activeTabId && targetSide === side && (
        <FloatingMacroToolbar
          editor={editorInstanceRef.current}
          engine={macroEngine}
        />
      )}
    </div>
  );
};
