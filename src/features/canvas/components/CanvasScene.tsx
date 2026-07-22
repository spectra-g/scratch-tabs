import { useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  type Viewport,
} from "@xyflow/react";
import type { Tab } from "../../../types";
import { DEFAULT_TEXT_ITEM_HEIGHT, DEFAULT_TEXT_ITEM_WIDTH } from "../constants";
import { useCanvasItems } from "../hooks/useCanvasItems";
import type { CanvasItem, CanvasSaveStatus } from "../types";
import { getCanvasViewportCenter } from "../utils/canvasCoordinates";
import type { CanvasFlowNode } from "../utils/canvasFlowMapping";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasNodeInteractionContext } from "./nodes/CanvasNodeInteractionContext";
import { TextNode } from "./nodes/TextNode";

const nodeTypes = { text: TextNode };

const isEditableTarget = (event: React.KeyboardEvent): boolean =>
  event
    .nativeEvent
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
  const canvasItems = useCanvasItems(initialItems, updateItems);
  const backgroundVariant =
    background === "grid" ? BackgroundVariant.Lines : BackgroundVariant.Dots;

  const addTextAtViewportCenter = () => {
    const pane = rootRef.current?.getBoundingClientRect();
    if (!pane) return;
    const center = getCanvasViewportCenter(pane, viewportRef.current);
    canvasItems.createTextItem({
      x: center.x - DEFAULT_TEXT_ITEM_WIDTH / 2,
      y: center.y - DEFAULT_TEXT_ITEM_HEIGHT / 2,
    });
  };

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
        if (event.key === "Delete" || event.key === "Backspace") {
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
          onNodeDragStop={(_event, node) =>
            canvasItems.commitNodePosition(node)
          }
          onPaneClick={() => {
            if (canvasItems.editingItemId) {
              canvasItems.cancelEditing(canvasItems.editingItemId);
            }
          }}
          onMove={(_event, nextViewport) => {
            viewportRef.current = nextViewport;
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
              selectedCount={canvasItems.selectedCount}
              onAddText={addTextAtViewportCenter}
              onDeleteSelection={canvasItems.deleteSelection}
            />
          </Panel>
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
          <div
            className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-base bg-surface/90 px-2.5 py-1 text-xs text-secondary shadow-sm backdrop-blur-sm"
            data-testid="canvas-save-status"
            data-save-state={status}
            data-save-revision={revision}
            aria-live="polite"
          >
            Local only ·{" "}
            {status === "saving"
              ? "Saving..."
              : status === "error"
                ? error || "Save failed"
                : "Saved"}
          </div>
        </ReactFlow>
      </CanvasNodeInteractionContext.Provider>
    </div>
  );
};
