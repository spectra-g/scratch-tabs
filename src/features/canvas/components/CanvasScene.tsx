import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
  type Viewport,
} from "@xyflow/react";
import type { Tab } from "../../../types";
import {
  DEFAULT_CODE_ITEM_HEIGHT,
  DEFAULT_CODE_ITEM_WIDTH,
  DEFAULT_IMAGE_ITEM_MAX_HEIGHT,
  DEFAULT_IMAGE_ITEM_MAX_WIDTH,
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../constants";
import {
  useCanvasItems,
  type CanvasImageOperations,
} from "../hooks/useCanvasItems";
import { useCanvasKeyboardShortcuts } from "../hooks/useCanvasKeyboardShortcuts";
import { useCanvasClipboard } from "../hooks/useCanvasClipboard";
import { useCanvasDrop } from "../hooks/useCanvasDrop";
import { useCanvasIngest } from "../hooks/useCanvasIngest";
import { useSpatialNavigation } from "../hooks/useSpatialNavigation";
import type { CanvasItem, CanvasSaveStatus } from "../types";
import {
  getCanvasViewportCenter,
  getCombinedCanvasBounds,
  getViewportToRevealCanvasBounds,
} from "../utils/canvasCoordinates";
import type { CanvasFlowNode } from "../utils/canvasFlowMapping";
import { CanvasToolbar } from "./CanvasToolbar";
import {
  CanvasContextMenu,
  type CanvasContextMenuPosition,
} from "./CanvasContextMenu";
import { CanvasSelectionToolbar } from "./CanvasSelectionToolbar";
import { CanvasShortcutHelp } from "./CanvasShortcutHelp";
import { CanvasNodeInteractionContext } from "./nodes/CanvasNodeInteractionContext";
import { TextNode } from "./nodes/TextNode";
import { CodeNode } from "./nodes/CodeNode";
import { ImageNode } from "./nodes/ImageNode";
import { useRendererStatusStore } from "../../../stores/rendererStatusStore";

const nodeTypes = { text: TextNode, code: CodeNode, image: ImageNode };
const multiSelectionKeyCodes = ["Meta", "Control", "Shift"];

interface CanvasSceneProps {
  tab: Tab;
  initialItems: CanvasItem[];
  edges: Array<{ id: string; source: string; target: string }>;
  viewport: Viewport;
  background: "dots" | "grid" | "none";
  status: CanvasSaveStatus;
  revision: number;
  error: string | null;
  updateItems: (items: CanvasItem[]) => void;
  imageOperations: CanvasImageOperations;
  saveViewport: (viewport: Viewport) => Promise<void>;
}

export const CanvasScene = ({
  tab,
  initialItems,
  edges,
  viewport,
  background,
  status,
  revision,
  error,
  updateItems,
  imageOperations,
  saveViewport,
}: CanvasSceneProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  const flowInstanceRef = useRef<ReactFlowInstance<CanvasFlowNode> | null>(
    null,
  );
  const automaticViewportRef = useRef<Viewport | null>(null);
  const [zoomPercent, setZoomPercent] = useState(() =>
    Math.round(viewport.zoom * 100),
  );
  const [contextMenuPosition, setContextMenuPosition] =
    useState<CanvasContextMenuPosition | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const canvasItems = useCanvasItems(
    initialItems,
    updateItems,
    tab.id,
    imageOperations,
  );
  const canvasIngest = useCanvasIngest({
    rootRef,
    viewportRef,
    tab,
    items: canvasItems.items,
    acceptIngestedItems: canvasItems.acceptIngestedItems,
  });
  const canvasDrop = useCanvasDrop({
    rememberPointer: canvasIngest.rememberPointer,
    ingestInputs: canvasIngest.ingestInputs,
  });
  const canvasClipboard = useCanvasClipboard({
    workspaceId: tab.workspaceId,
    interactionState: canvasItems.interactionState,
    getSelectedItems: canvasItems.getSelectedItems,
    deleteSelection: canvasItems.deleteSelection,
    ingestInputs: canvasIngest.ingestInputs,
    ingestClipboard: canvasIngest.ingestClipboard,
  });
  const backgroundVariant =
    background === "grid" ? BackgroundVariant.Lines : BackgroundVariant.Dots;

  const revealItem = useCallback((item: CanvasItem) => {
    const pane = rootRef.current?.getBoundingClientRect();
    const flowInstance = flowInstanceRef.current;
    if (!pane || !flowInstance) return;

    const nextViewport = getViewportToRevealCanvasBounds(
      item,
      pane,
      viewportRef.current,
    );
    if (
      nextViewport.x === viewportRef.current.x &&
      nextViewport.y === viewportRef.current.y
    ) {
      return;
    }

    automaticViewportRef.current = nextViewport;
    void flowInstance.setViewport(nextViewport, { duration: 150 });
  }, []);

  const fitSelection = useCallback(() => {
    const flowInstance = flowInstanceRef.current;
    if (!flowInstance) return;
    const selectedIds = new Set(canvasItems.interactionState.selectedItemIds);
    const bounds = getCombinedCanvasBounds(
      canvasItems.items.filter((item) => selectedIds.has(item.id)),
    );
    if (bounds) {
      void flowInstance.fitBounds(bounds, { padding: 0.18, duration: 150 });
      return;
    }
    void flowInstance.fitView({ padding: 0.18, duration: 150 });
  }, [canvasItems.interactionState.selectedItemIds, canvasItems.items]);

  const resetZoom = useCallback(() => {
    const pane = rootRef.current?.getBoundingClientRect();
    const flowInstance = flowInstanceRef.current;
    if (!pane || !flowInstance) return;
    if (canvasItems.interactionState.selectedItemIds.length === 0) {
      void flowInstance.fitView({ padding: 0.18, duration: 150 });
      return;
    }
    const focusedItem = canvasItems.focusedItemId
      ? canvasItems.items.find((item) => item.id === canvasItems.focusedItemId)
      : null;
    const center = focusedItem
      ? {
          x: focusedItem.x + focusedItem.width / 2,
          y: focusedItem.y + focusedItem.height / 2,
        }
      : getCanvasViewportCenter(pane, viewportRef.current);
    void flowInstance.setCenter(center.x, center.y, {
      zoom: 1,
      duration: 150,
    });
  }, [
    canvasItems.focusedItemId,
    canvasItems.interactionState.selectedItemIds.length,
    canvasItems.items,
  ]);

  const spatialNavigation = useSpatialNavigation({
    rootRef,
    items: canvasItems.items,
    interactionState: canvasItems.interactionState,
    selectForKeyboardNavigation: canvasItems.selectForKeyboardNavigation,
    beginEditing: canvasItems.beginEditing,
    clearSelection: canvasItems.clearSelection,
    revealItem,
  });

  const keyboardShortcuts = useCanvasKeyboardShortcuts({
    interactionState: canvasItems.interactionState,
    itemCount: canvasItems.items.length,
    markKeyboardInteraction: canvasItems.markKeyboardInteraction,
    navigateDirection: spatialNavigation.navigateDirection,
    navigateSequentially: spatialNavigation.navigateSequentially,
    enterFocusedItem: spatialNavigation.enterFocusedItem,
    escapeNavigation: spatialNavigation.escapeNavigation,
    selectAll: canvasItems.selectAll,
    deleteSelection: canvasItems.deleteSelection,
    duplicateSelection: canvasItems.duplicateSelection,
    nudgeSelection: canvasItems.nudgeSelection,
    undo: canvasItems.undo,
    redo: canvasItems.redo,
    fitSelection,
    resetZoom,
    announce: spatialNavigation.announce,
  });

  useEffect(() => {
    useRendererStatusStore.getState().setContribution(tab.id, {
      label: "Canvas",
      itemCount: canvasItems.items.length,
      selectionCount: canvasItems.selectedCount,
      zoomPercent,
      save: {
        state: status,
        revision,
        scopeLabel: "Local only",
        ...(error ? { error } : {}),
      },
    });
  }, [
    tab.id,
    canvasItems.items.length,
    canvasItems.selectedCount,
    zoomPercent,
    status,
    revision,
    error,
  ]);

  useEffect(
    () => () => useRendererStatusStore.getState().clearContribution(tab.id),
    [tab.id],
  );

  const addTextAtViewportCenter = () => {
    const pane = rootRef.current?.getBoundingClientRect();
    if (!pane) return;
    const center = getCanvasViewportCenter(pane, viewportRef.current);
    const column = canvasItems.items.length % 2;
    const row = Math.floor(canvasItems.items.length / 2);
    canvasItems.createTextItem({
      x:
        center.x -
        DEFAULT_TEXT_ITEM_WIDTH / 2 +
        column * (DEFAULT_TEXT_ITEM_WIDTH + 32),
      y:
        center.y -
        DEFAULT_TEXT_ITEM_HEIGHT / 2 +
        row * (DEFAULT_TEXT_ITEM_HEIGHT + 32),
    });
  };

  const addCodeAtViewportCenter = () => {
    const pane = rootRef.current?.getBoundingClientRect();
    if (!pane) return;
    const center = getCanvasViewportCenter(pane, viewportRef.current);
    const column = canvasItems.items.length % 2;
    const row = Math.floor(canvasItems.items.length / 2);
    canvasItems.createCodeItem({
      x:
        center.x -
        DEFAULT_CODE_ITEM_WIDTH / 2 +
        column * (DEFAULT_CODE_ITEM_WIDTH + 32),
      y:
        center.y -
        DEFAULT_CODE_ITEM_HEIGHT / 2 +
        row * (DEFAULT_CODE_ITEM_HEIGHT + 32),
    });
  };

  const addImageAtViewportCenter = async (file: File) => {
    const pane = rootRef.current?.getBoundingClientRect();
    if (!pane) return;
    setImageError(null);
    const center = getCanvasViewportCenter(pane, viewportRef.current);
    try {
      await canvasItems.createImageItem(
        {
          x: center.x - DEFAULT_IMAGE_ITEM_MAX_WIDTH / 2,
          y: center.y - DEFAULT_IMAGE_ITEM_MAX_HEIGHT / 2,
        },
        file,
      );
    } catch (imageSaveError) {
      setImageError(
        imageSaveError instanceof Error
          ? imageSaveError.message
          : "The image could not be added to this Canvas.",
      );
    }
  };

  const closeContextMenu = useCallback(() => setContextMenuPosition(null), []);

  const openContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  return (
    <div
      ref={rootRef}
      className="canvas-flow-root h-full w-full bg-canvas text-main"
      data-testid="canvas-flow"
      data-canvas-document-id={tab.documentId}
      data-canvas-drop-zone="true"
      data-canvas-mode={canvasItems.interactionState.mode}
      data-focused-item-id={canvasItems.focusedItemId ?? ""}
      data-edge-direction={spatialNavigation.edgeDirection ?? ""}
      data-canvas-zoom={viewportRef.current.zoom}
      data-canvas-viewport-x={viewportRef.current.x}
      data-canvas-viewport-y={viewportRef.current.y}
      data-canvas-selected-tool="select"
      data-canvas-active-tool={
        keyboardShortcuts.isSpacePanning ? "pan" : "select"
      }
      data-canvas-pan-active={keyboardShortcuts.isSpacePanning}
      tabIndex={canvasItems.focusedItemId === null ? 0 : -1}
      role="application"
      aria-label={`${tab.title} Canvas`}
      onFocus={spatialNavigation.handleRootFocus}
      onKeyDown={keyboardShortcuts.handleKeyDown}
      onKeyUp={keyboardShortcuts.handleKeyUp}
      onPointerMove={canvasDrop.handlePointerMove}
      onDragOver={canvasDrop.handleDragOver}
      onDrop={canvasDrop.handleDrop}
      onCopy={canvasClipboard.handleCopy}
      onCut={canvasClipboard.handleCut}
      onPaste={canvasClipboard.handlePaste}
    >
      <CanvasNodeInteractionContext.Provider value={canvasItems.interaction}>
        <ReactFlow<CanvasFlowNode>
          nodes={canvasItems.nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultViewport={viewport}
          minZoom={0.1}
          maxZoom={4}
          panOnDrag
          panActivationKeyCode={null}
          nodesDraggable={!keyboardShortcuts.isSpacePanning}
          elementsSelectable={!keyboardShortcuts.isSpacePanning}
          zoomOnPinch
          zoomOnScroll
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          disableKeyboardA11y
          autoPanOnNodeFocus={false}
          deleteKeyCode={null}
          onInit={(instance) => {
            flowInstanceRef.current = instance;
          }}
          onNodesChange={canvasItems.onNodesChange}
          multiSelectionKeyCode={multiSelectionKeyCodes}
          elevateNodesOnSelect={false}
          onNodeClick={(_event, node) => {
            if (
              canvasItems.editingItemId &&
              canvasItems.editingItemId !== node.id
            ) {
              canvasItems.cancelEditing(canvasItems.editingItemId);
            }
          }}
          onNodeDoubleClick={(_event, node) =>
            canvasItems.beginEditing(node.id)
          }
          onNodeDragStop={() => canvasItems.commitNodePositions()}
          onNodeContextMenu={(event, node) => {
            if (!node.selected) canvasItems.selectOnly(node.id);
            else canvasItems.focusItem(node.id);
            openContextMenu(event);
          }}
          onSelectionContextMenu={(event) => openContextMenu(event)}
          onPaneClick={() => {
            closeContextMenu();
            if (canvasItems.editingItemId) {
              canvasItems.cancelEditing(canvasItems.editingItemId);
            }
          }}
          onMove={(_event, nextViewport) => {
            viewportRef.current = nextViewport;
            if (rootRef.current) {
              rootRef.current.dataset.canvasZoom = String(nextViewport.zoom);
              rootRef.current.dataset.canvasViewportX = String(nextViewport.x);
              rootRef.current.dataset.canvasViewportY = String(nextViewport.y);
            }
            setZoomPercent(Math.round(nextViewport.zoom * 100));
          }}
          onMoveEnd={(_event, nextViewport) => {
            viewportRef.current = nextViewport;
            const automaticViewport = automaticViewportRef.current;
            automaticViewportRef.current = null;
            if (
              automaticViewport &&
              Math.abs(automaticViewport.x - nextViewport.x) < 0.01 &&
              Math.abs(automaticViewport.y - nextViewport.y) < 0.01 &&
              automaticViewport.zoom === nextViewport.zoom
            ) {
              return;
            }
            void saveViewport(nextViewport);
          }}
        >
          {background !== "none" && (
            <Background
              variant={backgroundVariant}
              color="rgb(var(--color-border-base))"
              gap={20}
              size={1.5}
            />
          )}
          <Panel position="top-left">
            <CanvasToolbar
              onAddText={addTextAtViewportCenter}
              onAddCode={addCodeAtViewportCenter}
              onAddImage={(file) => void addImageAtViewportCenter(file)}
              canUndo={canvasItems.canUndo}
              canRedo={canvasItems.canRedo}
              onUndo={canvasItems.undo}
              onRedo={canvasItems.redo}
              onShowShortcuts={keyboardShortcuts.showShortcutHelp}
            />
          </Panel>
          {canvasItems.selectedCount > 0 && (
            <Panel position="top-right">
              <CanvasSelectionToolbar
                selectedCount={canvasItems.selectedCount}
                onDuplicate={canvasItems.duplicateSelection}
                onBringForward={() =>
                  canvasItems.moveSelectionOneLayer("forward")
                }
                onSendBackward={() =>
                  canvasItems.moveSelectionOneLayer("backward")
                }
                onDelete={canvasItems.deleteSelection}
              />
            </Panel>
          )}
          <Controls position="bottom-right" showInteractive={false} />
          {canvasItems.items.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border border-base bg-surface/90 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
                <p className="font-medium text-main">Empty Canvas</p>
                <p className="mt-1 text-xs text-muted">
                  Add a text, code, or image card, or pan and zoom to explore.
                </p>
              </div>
            </div>
          )}
        </ReactFlow>
      </CanvasNodeInteractionContext.Provider>
      {(imageError || canvasIngest.error) && (
        <div
          className="absolute left-1/2 top-20 z-20 max-w-md -translate-x-1/2 rounded border border-danger/40 bg-surface px-4 py-3 text-sm text-danger shadow"
          role="alert"
          data-testid={
            imageError ? "canvas-image-error" : "canvas-ingest-error"
          }
        >
          {imageError ?? canvasIngest.error}
        </div>
      )}
      {contextMenuPosition && canvasItems.selectedCount > 0 && (
        <CanvasContextMenu
          position={contextMenuPosition}
          selectedCount={canvasItems.selectedCount}
          onDuplicate={canvasItems.duplicateSelection}
          onBringForward={() => canvasItems.moveSelectionOneLayer("forward")}
          onSendBackward={() => canvasItems.moveSelectionOneLayer("backward")}
          onDelete={canvasItems.deleteSelection}
          onClose={closeContextMenu}
        />
      )}
      {keyboardShortcuts.isShortcutHelpOpen && (
        <CanvasShortcutHelp onClose={keyboardShortcuts.closeShortcutHelp} />
      )}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="canvas-navigation-announcement"
      >
        {spatialNavigation.announcement}
      </div>
    </div>
  );
};
