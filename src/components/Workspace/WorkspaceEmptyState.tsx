import React, { useCallback, useMemo, useEffect, useState, useRef } from "react";
import { useRootStore } from "../../stores/rootStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { FolderOpen } from "../Icons";
import { EmptyStateActionCard } from "./EmptyStateActionCard";
import { useFileImport } from "../../hooks/useFileImport";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { useCanvasFeatureEnabled } from "../../features/canvas/hooks/useCanvasFeatureEnabled";

/**
 * WorkspaceEmptyState
 *
 * Displays a contextual empty state when a workspace has no tabs.
 * Provides primary actions to populate the workspace:
 * - Create new tab
 * - Paste from clipboard
 * - Open file from disk
 *
 * Following the "empty folder" UX pattern - workspaces persist when empty.
 */
export const WorkspaceEmptyState: React.FC = () => {
  const {
    handleNewTab,
    handleNewCanvas,
    handleNewTabFromPaste,
    handleNewPopulatedTab,
  } = useRootStore();
  const { activeWorkspaceId, workspaces } = useWorkspaceStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const canvasEnabled = useCanvasFeatureEnabled();

  // Memoize workspace lookup to avoid unnecessary recomputation on render.
  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId]
  );

  const workspaceName = currentWorkspace?.name || "Workspace";

  const { openFileDialog } = useFileImport({
    onFileLoaded: useCallback(
      (content: string, fileName: string) => {
        handleNewPopulatedTab(
          {
            title: fileName,
            content: content,
            language: "plaintext", // Language detection happens in handleNewPopulatedTab
          },
          false
        );
      },
      [handleNewPopulatedTab]
    ),
  });

  const handleNewTabClick = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handlePasteClick = useCallback(() => {
    handleNewTabFromPaste(false);
  }, [handleNewTabFromPaste]);

  const handleNewCanvasClick = useCallback(() => {
    void handleNewCanvas(false);
  }, [handleNewCanvas]);

  const handleDoubleClick = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        handleNewTab(false, text);
      }
    },
    [handleNewTab]
  );

  const handleOpenToolSelector = useCallback(() => {
    setTimeout(() => {
      setShowToolSelector(true);
    }, 50);
  }, []);

  const handleToolSelect = useCallback(
    async (item: ToolItem) => {
      await toolService.executeTool(item, {
        side: 'left',
        activeWorkspaceId: activeWorkspaceId || '',
        addTab: (tabData) => handleNewPopulatedTab(tabData),
        createCanvas: (isRight) => handleNewCanvas(isRight),
      });
      setShowToolSelector(false);
    },
    [handleNewCanvas, handleNewPopulatedTab, activeWorkspaceId]
  );

  // Keyboard handler for "/" key to open tool selector
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !showToolSelector) {
        e.preventDefault();
        handleOpenToolSelector();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showToolSelector, handleOpenToolSelector]);

  return (
    <>
      <div
        ref={containerRef}
        className="h-full w-full flex flex-col items-center justify-center bg-canvas text-main p-8 animate-in fade-in duration-300 cursor-pointer outline-none"
        data-testid="workspace-empty-state"
        onDoubleClick={handleDoubleClick}
        onPaste={handlePaste}
        tabIndex={-1}
      >
      {/* Icon Graphic */}
      <div className="mb-6 p-6 bg-surface-secondary/50 rounded-sm">
        <FolderOpen size={48} className="text-muted/50" />
      </div>

      {/* Header */}
      <h2 className="text-xl font-semibold text-main mb-2">
        {workspaceName} is empty
      </h2>
      <p className="text-sm text-muted mb-8 text-center max-w-md">
        This workspace is ready for your content. Drag and drop files here, or
        use one of the actions below.
      </p>

      {/* Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full max-w-4xl">
        <EmptyStateActionCard
          label="New Tab"
          description="Empty Scratch Tab"
          icon="plus"
          colorScheme="primary"
          onClick={handleNewTabClick}
          testId="new-tab-action"
        />
        {canvasEnabled && (
          <EmptyStateActionCard
            label="New Canvas"
            description="Spatial workspace"
            icon="canvas"
            colorScheme="primary"
            onClick={handleNewCanvasClick}
            testId="new-canvas-action"
          />
        )}
        <EmptyStateActionCard
          label="Paste"
          description="From Clipboard"
          icon="upload"
          colorScheme="info"
          onClick={handlePasteClick}
          testId="paste-action"
        />
        <EmptyStateActionCard
          label="Open File"
          description="From Disk"
          icon="file"
          colorScheme="warning"
          onClick={openFileDialog}
          testId="open-file-action"
        />
      </div>

      {/* Keyboard Hints */}
      <div className="mt-12 text-xs text-muted font-mono flex flex-col sm:flex-row gap-4 text-center">
        <span>
          <kbd className="bg-surface border border-base px-1 rounded">
            Double Click
          </kbd>{" "}
          to create tab
        </span>
        <span>
          <kbd className="bg-surface border border-base px-1 rounded">/</kbd>{" "}
          for tablet tools
        </span>
      </div>
      </div>

      {/* Tool Selector Modal */}
      {showToolSelector && (
        <ToolSelectorModal
          onClose={() => setShowToolSelector(false)}
          onSelect={handleToolSelect}
        />
      )}
    </>
  );
};
