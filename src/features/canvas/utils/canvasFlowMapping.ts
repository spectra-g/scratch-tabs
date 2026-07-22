import type { Edge, Node } from "@xyflow/react";
import type { CanvasEdge, CanvasItem, CanvasTextItem } from "../types";

export type CanvasTextNodeData = {
  item: CanvasTextItem;
  isEditing: boolean;
  isFocused: boolean;
};

export type CanvasFlowNode = Node<CanvasTextNodeData, "text">;

export const canvasItemToFlowNode = (
  item: CanvasItem,
  editingItemId: string | null = null,
  selectedItemIds: ReadonlySet<string> = new Set(),
  focusedItemId: string | null = null,
): CanvasFlowNode => ({
  id: item.id,
  type: "text",
  position: { x: item.x, y: item.y },
  width: item.width,
  height: item.height,
  zIndex: item.zIndex,
  selected: selectedItemIds.has(item.id),
  draggable: editingItemId !== item.id,
  data: {
    item: { ...item },
    isEditing: editingItemId === item.id,
    isFocused: focusedItemId === item.id,
  },
  ariaLabel: `Text card${item.text.trim() ? `, ${item.text.trim().slice(0, 80)}` : ""}`,
});

export const canvasItemsToFlowNodes = (
  items: CanvasItem[],
  editingItemId: string | null = null,
  selectedItemIds: ReadonlySet<string> = new Set(),
  focusedItemId: string | null = null,
): CanvasFlowNode[] =>
  items.map((item) =>
    canvasItemToFlowNode(item, editingItemId, selectedItemIds, focusedItemId),
  );

export const canvasEdgesToFlowEdges = (edges: CanvasEdge[]): Edge[] =>
  edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceItemId,
    target: edge.targetItemId,
  }));

export const flowEdgesToCanvasEdges = (edges: Edge[]): CanvasEdge[] =>
  edges.map((edge) => ({
    id: edge.id,
    sourceItemId: edge.source,
    targetItemId: edge.target,
  }));

export const updateItemFromFlowNode = (
  item: CanvasItem,
  node: Pick<CanvasFlowNode, "position" | "width" | "height" | "measured">,
  now = Date.now(),
): CanvasItem => ({
  ...item,
  x: node.position.x,
  y: node.position.y,
  width: node.width ?? node.measured?.width ?? item.width,
  height: node.height ?? node.measured?.height ?? item.height,
  updatedAt: now,
});
