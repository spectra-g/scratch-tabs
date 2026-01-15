import React, { Suspense, lazy } from "react";
import { EditorInstance } from "./EditorInstance";
import { TabletView } from "../Tab/TabletView";
import { modelManager } from "../../services/modelManager";
import type { Tab } from "../../types";
import type { SmartView } from "../../views/registry";
import type * as Monaco from "monaco-editor";

// Lazy load the RichTextEditor component
const RichTextEditor = lazy(() =>
  import("../RichText/RichTextEditor").then((module) => ({
    default: module.RichTextEditor,
  }))
);

const RichTextLoadingFallback = () => (
  <div className="h-full flex items-center justify-center text-muted">
    <div className="text-center">
      <div className="animate-pulse">Loading Editor...</div>
    </div>
  </div>
);

interface TabContentRendererProps {
  /** The active tab to render content for */
  activeTab: Tab | null;
  /** The active tab ID */
  activeTabId: string | null;
  /** Which side of the split view this renderer is on */
  side: "left" | "right";
  /** Content to pass to preview components */
  previewContent: string;
  /** Whether the tab should render a replacement smart view (e.g., CSV table) */
  shouldShowReplacementView: boolean;
  /** The extended view configuration, if any */
  extendedView: SmartView | null;
  /** Callback to update tab state */
  updateTabState: (tabId: string, updates: Partial<Tab>) => void;
  /** Callback when tablet state changes */
  onTabletStateChange: (newState: string) => void;
  /** Callback when rich content changes */
  onRichContentChange: (richContent: any) => void;
  /** Callback to upgrade a plain text tab to rich text */
  onUpgradeToRich: () => void;
  /** Callback when the Monaco editor is ready */
  onEditorReady: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

/**
 * Renders the appropriate content for a tab based on its type:
 * - Replacement smart view (e.g., CSV table editor)
 * - Rich text editor
 * - Tablet view
 * - Monaco editor instance
 * - Empty state when no tab is selected
 */
export const TabContentRenderer: React.FC<TabContentRendererProps> = ({
  activeTab,
  activeTabId,
  side,
  previewContent,
  shouldShowReplacementView,
  extendedView,
  updateTabState,
  onTabletStateChange,
  onRichContentChange,
  onUpgradeToRich,
  onEditorReady,
}) => {
  // No tab selected
  if (!activeTab || !activeTabId) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        <p>No tab selected</p>
      </div>
    );
  }

  // Replacement view (like CSV table editor)
  if (shouldShowReplacementView && extendedView) {
    return (
      <extendedView.component
        content={previewContent}
        onContentChange={(newContent: string) => {
          updateTabState(activeTab.id, { content: newContent });
          // Invalidate the cached model so it gets recreated with fresh content
          modelManager.invalidateModel(activeTab.id);
        }}
        tabId={activeTab.id}
        isActive={true}
        side={side}
      />
    );
  }

  // Rich text editor
  if (activeTab.isRich) {
    return (
      <Suspense fallback={<RichTextLoadingFallback />}>
        <RichTextEditor
          key={activeTab.id}
          tab={activeTab}
          onContentChange={onRichContentChange}
          onUpgradeToRich={onUpgradeToRich}
        />
      </Suspense>
    );
  }

  // Tablet view
  if (activeTab.isTablet) {
    return <TabletView tab={activeTab} onChange={onTabletStateChange} />;
  }

  // Default: Monaco editor instance
  return (
    <EditorInstance
      key={activeTab.id}
      side={side}
      activeTabId={activeTabId}
      onUpgradeToRich={onUpgradeToRich}
      onEditorReady={onEditorReady}
    />
  );
};
