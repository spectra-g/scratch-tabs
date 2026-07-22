import type { Edge, Node } from "@xyflow/react";
import type {
  CanvasCodeItem,
  CanvasEdge,
  CanvasItem,
  CanvasTextItem,
} from "../types";
import { getCanvasItemAccessibleLabel } from "./canvasAccessibility";

export type CanvasTextNodeData = {
  item: CanvasTextItem;
  isEditing: boolean;
  isFocused: boolean;
};

export type CanvasCodeNodeData = {
  item: CanvasCodeItem;
  isEditing: boolean;
  isFocused: boolean;
};

export type CanvasTextFlowNode = Node<CanvasTextNodeData, "text">;
export type CanvasCodeFlowNode = Node<CanvasCodeNodeData, "code">;
export type CanvasFlowNode = CanvasTextFlowNode | CanvasCodeFlowNode;

export const canvasItemToFlowNode = (
  item: CanvasItem,
  editingItemId: string | null = null,
  selectedItemIds: ReadonlySet<string> = new Set(),
  focusedItemId: string | null = null,
): CanvasFlowNode => {
  const common = {
    id: item.id,
    position: { x: item.x, y: item.y },
    width: item.width,
    height: item.height,
    zIndex: item.zIndex,
    selected: selectedItemIds.has(item.id),
    draggable: editingItemId !== item.id,
    ariaLabel: getCanvasItemAccessibleLabel(item),
  };
  const interaction = {
    isEditing: editingItemId === item.id,
    isFocused: focusedItemId === item.id,
  };

  return item.type === "code"
    ? {
        ...common,
        type: "code",
        data: { item: { ...item }, ...interaction },
      }
    : {
        ...common,
        type: "text",
        data: { item: { ...item }, ...interaction },
      };
};

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
