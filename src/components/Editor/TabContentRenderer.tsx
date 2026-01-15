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
 * Context object passed to renderer condition and render functions.
 * Contains all props needed to determine which renderer to use.
 */
interface RendererContext {
  activeTab: Tab | null;
  activeTabId: string | null;
  side: "left" | "right";
  previewContent: string;
  shouldShowReplacementView: boolean;
  extendedView: SmartView | null;
  updateTabState: (tabId: string, updates: Partial<Tab>) => void;
  onTabletStateChange: (newState: string) => void;
  onRichContentChange: (richContent: any) => void;
  onUpgradeToRich: () => void;
  onEditorReady: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
}

/**
 * Configuration for a content renderer.
 * Renderers are evaluated in order - first matching condition wins.
 */
interface RendererConfig {
  /** Unique identifier for debugging */
  id: string;
  /** Predicate that determines if this renderer should be used */
  condition: (ctx: RendererContext) => boolean;
  /** Function that returns the rendered content */
  render: (ctx: RendererContext) => React.ReactNode;
}

/**
 * Configuration array for content renderers.
 * Order matters - first matching condition is used.
 * This pattern makes the rendering logic declarative and easy to extend.
 */
const RENDERER_CONFIG: RendererConfig[] = [
  {
    id: "empty-state",
    condition: (ctx) => !ctx.activeTab || !ctx.activeTabId,
    render: () => (
      <div className="h-full flex items-center justify-center text-muted">
        <p>No tab selected</p>
      </div>
    ),
  },
  {
    id: "replacement-view",
    condition: (ctx) => ctx.shouldShowReplacementView && ctx.extendedView !== null,
    render: (ctx) => {
      const { activeTab, extendedView, previewContent, updateTabState, side } = ctx;
      if (!extendedView || !activeTab) return null;
      return (
        <extendedView.component
          content={previewContent}
          onContentChange={(newContent: string) => {
            updateTabState(activeTab.id, { content: newContent });
            modelManager.invalidateModel(activeTab.id);
          }}
          tabId={activeTab.id}
          isActive={true}
          side={side}
        />
      );
    },
  },
  {
    id: "rich-text",
    condition: (ctx) => ctx.activeTab?.isRich === true,
    render: (ctx) => {
      const { activeTab, onRichContentChange, onUpgradeToRich } = ctx;
      if (!activeTab) return null;
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
    },
  },
  {
    id: "tablet",
    condition: (ctx) => ctx.activeTab?.isTablet === true,
    render: (ctx) => {
      const { activeTab, onTabletStateChange } = ctx;
      if (!activeTab) return null;
      return <TabletView tab={activeTab} onChange={onTabletStateChange} />;
    },
  },
  {
    id: "monaco-editor",
    condition: () => true, // Default fallback
    render: (ctx) => {
      const { activeTab, activeTabId, side, onUpgradeToRich, onEditorReady } = ctx;
      if (!activeTab || !activeTabId) return null;
      return (
        <EditorInstance
          key={activeTab.id}
          side={side}
          activeTabId={activeTabId}
          onUpgradeToRich={onUpgradeToRich}
          onEditorReady={onEditorReady}
        />
      );
    },
  },
];

/**
 * Finds the appropriate renderer based on the context.
 * Returns the first renderer whose condition matches.
 */
function getRenderer(ctx: RendererContext): RendererConfig {
  const renderer = RENDERER_CONFIG.find((config) => config.condition(ctx));
  // Default should always match, but TypeScript needs the fallback
  return renderer || RENDERER_CONFIG[RENDERER_CONFIG.length - 1];
}

/**
 * Renders the appropriate content for a tab based on its type:
 * - Replacement smart view (e.g., CSV table editor)
 * - Rich text editor
 * - Tablet view
 * - Monaco editor instance
 * - Empty state when no tab is selected
 */
export const TabContentRenderer: React.FC<TabContentRendererProps> = (props) => {
  const ctx: RendererContext = props;
  const renderer = getRenderer(ctx);
  return <>{renderer.render(ctx)}</>;
};
