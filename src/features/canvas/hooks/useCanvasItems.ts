import { useCallback, useMemo, useRef, useState } from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import type { CanvasItem } from "../types";
import {
  canvasItemsToFlowNodes,
  type CanvasFlowNode,
  updateItemFromFlowNode,
} from "../utils/canvasFlowMapping";
import {
  createTextCanvasItem,
  type CanvasPoint,
} from "../utils/canvasItemFactory";
import type { CanvasNodeBounds } from "../components/nodes/CanvasNodeInteractionContext";

interface ReplaceItemsOptions {
  editingItemId?: string | null;
  selectedIds?: Set<string>;
}

export const useCanvasItems = (
  initialItems: CanvasItem[],
  persistItems: (items: CanvasItem[]) => void,
) => {
  const [items, setItems] = useState<CanvasItem[]>(initialItems);
  const itemsRef = useRef(items);
  const [nodes, setNodes] = useState<CanvasFlowNode[]>(() =>
    canvasItemsToFlowNodes(initialItems),
  );
  const nodesRef = useRef(nodes);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingItemIdRef = useRef(editingItemId);

  const replaceFlowNodes = useCallback((nextNodes: CanvasFlowNode[]) => {
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  }, []);

  const replaceItems = useCallback(
    (nextItems: CanvasItem[], options: ReplaceItemsOptions = {}) => {
      const nextEditingItemId =
        options.editingItemId === undefined
          ? editingItemIdRef.current
          : options.editingItemId;
      const selectedIds =
        options.selectedIds ??
        new Set(
          nodesRef.current
            .filter((node) => node.selected)
            .map((node) => node.id),
        );

      itemsRef.current = nextItems;
      editingItemIdRef.current = nextEditingItemId;
      setItems(nextItems);
      setEditingItemId(nextEditingItemId);
      replaceFlowNodes(
        canvasItemsToFlowNodes(nextItems, nextEditingItemId, selectedIds),
      );
      persistItems(nextItems);
    },
    [persistItems, replaceFlowNodes],
  );

  const beginEditing = useCallback(
    (itemId: string) => {
      editingItemIdRef.current = itemId;
      setEditingItemId(itemId);
      replaceFlowNodes(
        canvasItemsToFlowNodes(itemsRef.current, itemId, new Set([itemId])),
      );
    },
    [replaceFlowNodes],
  );

  const cancelEditing = useCallback(
    (itemId: string) => {
      editingItemIdRef.current = null;
      setEditingItemId(null);
      replaceFlowNodes(
        canvasItemsToFlowNodes(itemsRef.current, null, new Set([itemId])),
      );
    },
    [replaceFlowNodes],
  );

  const commitText = useCallback(
    (itemId: string, text: string) => {
      const current = itemsRef.current.find((item) => item.id === itemId);
      if (!current || current.type !== "text") return;
      if (current.text === text) {
        cancelEditing(itemId);
        return;
      }

      const now = Date.now();
      replaceItems(
        itemsRef.current.map((item) =>
          item.id === itemId ? { ...item, text, updatedAt: now } : item,
        ),
        { editingItemId: null, selectedIds: new Set([itemId]) },
      );
    },
    [cancelEditing, replaceItems],
  );

  const commitResize = useCallback(
    (itemId: string, bounds: CanvasNodeBounds) => {
      const now = Date.now();
      replaceItems(
        itemsRef.current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                updatedAt: now,
              }
            : item,
        ),
        { selectedIds: new Set([itemId]) },
      );
    },
    [replaceItems],
  );

  const createTextItem = useCallback(
    (position: CanvasPoint) => {
      const item = createTextCanvasItem({
        position,
        zIndex:
          Math.max(
            0,
            ...itemsRef.current.map((candidate) => candidate.zIndex),
          ) + 1,
      });
      replaceItems([...itemsRef.current, item], {
        editingItemId: item.id,
        selectedIds: new Set([item.id]),
      });
    },
    [replaceItems],
  );

  const deleteSelection = useCallback(() => {
    const selectedIds = new Set(
      nodesRef.current
        .filter((node) => node.selected)
        .map((node) => node.id),
    );
    if (selectedIds.size === 0) return;
    replaceItems(
      itemsRef.current.filter((item) => !selectedIds.has(item.id)),
      { editingItemId: null, selectedIds: new Set() },
    );
  }, [replaceItems]);

  const commitNodePosition = useCallback(
    (node: CanvasFlowNode) => {
      const item = itemsRef.current.find(
        (candidate) => candidate.id === node.id,
      );
      if (!item) return;
      replaceItems(
        itemsRef.current.map((candidate) =>
          candidate.id === node.id
            ? updateItemFromFlowNode(item, node)
            : candidate,
        ),
        { selectedIds: new Set([node.id]) },
      );
    },
    [replaceItems],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasFlowNode>[]) => {
      const nextNodes = applyNodeChanges(changes, nodesRef.current);
      replaceFlowNodes(nextNodes);
    },
    [replaceFlowNodes],
  );

  const clearSelection = useCallback(() => {
    replaceFlowNodes(
      nodesRef.current.map((node) => ({ ...node, selected: false })),
    );
  }, [replaceFlowNodes]);

  const interaction = useMemo(
    () => ({ beginEditing, cancelEditing, commitResize, commitText }),
    [beginEditing, cancelEditing, commitResize, commitText],
  );

  return {
    items,
    nodes,
    editingItemId,
    selectedCount: nodes.filter((node) => node.selected).length,
    interaction,
    beginEditing,
    cancelEditing,
    createTextItem,
    deleteSelection,
    commitNodePosition,
    onNodesChange,
    clearSelection,
  };
};
