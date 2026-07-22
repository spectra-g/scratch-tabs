import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  type Viewport,
} from "@xyflow/react";
import type { Tab } from "../../../types";
import {
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../constants";
import { useCanvasItems } from "../hooks/useCanvasItems";
import type { CanvasItem, CanvasSaveStatus } from "../types";
import { getCanvasViewportCenter } from "../utils/canvasCoordinates";
import type { CanvasFlowNode } from "../utils/canvasFlowMapping";
import { CanvasToolbar } from "./CanvasToolbar";
import {
  CanvasContextMenu,
  type CanvasContextMenuPosition,
} from "./CanvasContextMenu";
import { CanvasSelectionToolbar } from "./CanvasSelectionToolbar";
import { CanvasNodeInteractionContext } from "./nodes/CanvasNodeInteractionContext";
import { TextNode } from "./nodes/TextNode";
import { useRendererStatusStore } from "../../../stores/rendererStatusStore";

const nodeTypes = { text: TextNode };
const multiSelectionKeyCodes = ["Meta", "Control", "Shift"];

const isEditableTarget = (event: React.KeyboardEvent): boolean =>
  event.nativeEvent
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"),
    );

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
  saveViewport,
}: CanvasSceneProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  const [zoomPercent, setZoomPercent] = useState(() =>
    Math.round(viewport.zoom * 100),
  );
  const [contextMenuPosition, setContextMenuPosition] =
    useState<CanvasContextMenuPosition | null>(null);
  const canvasItems = useCanvasItems(initialItems, updateItems);
  const backgroundVariant =
    background === "grid" ? BackgroundVariant.Lines : BackgroundVariant.Dots;

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
      tabIndex={0}
      role="application"
      aria-label={`${tab.title} Canvas`}
      onKeyDown={(event) => {
        if (isEditableTarget(event)) return;
        const commandKey = event.metaKey || event.ctrlKey;
        if (commandKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) canvasItems.redo();
          else canvasItems.undo();
        } else if (commandKey && event.key.toLowerCase() === "y") {
          event.preventDefault();
          event.stopPropagation();
          canvasItems.redo();
        } else if (commandKey && event.key.toLowerCase() === "d") {
          event.preventDefault();
          event.stopPropagation();
          canvasItems.duplicateSelection();
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          canvasItems.deleteSelection();
        } else if (event.key === "Enter") {
          const selected = canvasItems.nodes.find((node) => node.selected);
          if (selected) {
            event.preventDefault();
            canvasItems.beginEditing(selected.id);
          }
        } else if (
          event.key === "Escape" &&
          canvasItems.editingItemId === null
        ) {
          canvasItems.clearSelection();
          rootRef.current?.focus();
        }
      }}
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
          zoomOnPinch
          zoomOnScroll
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          deleteKeyCode={null}
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
            setZoomPercent(Math.round(nextViewport.zoom * 100));
          }}
          onMoveEnd={(_event, nextViewport) => {
            viewportRef.current = nextViewport;
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
              canUndo={canvasItems.canUndo}
              canRedo={canvasItems.canRedo}
              onUndo={canvasItems.undo}
              onRedo={canvasItems.redo}
            />
          </Panel>
          {canvasItems.selectedCount > 0 && (
            <Panel position="top-center">
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
                  Add a text card or pan and zoom to explore.
                </p>
              </div>
            </div>
          )}
        </ReactFlow>
      </CanvasNodeInteractionContext.Provider>
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
    </div>
  );
};
