import { useCallback, useMemo, useRef, useState } from "react";
import { applyNodeChanges, type NodeChange } from "@xyflow/react";
import type {
  CanvasFocusOrigin,
  CanvasInteractionState,
  CanvasItem,
} from "../types";
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
import type { CanvasHistorySnapshot } from "../services/CanvasHistory";
import { useCanvasHistory } from "./useCanvasHistory";
import {
  duplicateCanvasItems,
  getSelectionFallbackAfterDeletion,
  moveCanvasItemsOneLayer,
  type CanvasLayerDirection,
} from "../utils/canvasSelectionOperations";

interface ReplaceItemsOptions {
  editingItemId?: string | null;
  selectedIds?: ReadonlySet<string>;
  focusedItemId?: string | null;
}

const sameBounds = (item: CanvasItem, node: CanvasFlowNode): boolean =>
  item.x === node.position.x &&
  item.y === node.position.y &&
  item.width === (node.width ?? node.measured?.width ?? item.width) &&
  item.height === (node.height ?? node.measured?.height ?? item.height);

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
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const focusedItemIdRef = useRef(focusedItemId);
  const [focusOrigin, setFocusOrigin] = useState<CanvasFocusOrigin>(null);
  const focusOriginRef = useRef(focusOrigin);
  const {
    record: recordHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useCanvasHistory();
  const pointerSelectionRef = useRef<{
    itemId: string;
    selectedIds: Set<string>;
    additive: boolean;
  } | null>(null);

  const selectedItemIds = useCallback(
    () =>
      new Set(
        nodesRef.current.filter((node) => node.selected).map((node) => node.id),
      ),
    [],
  );

  const currentSnapshot = useCallback(
    (): CanvasHistorySnapshot => ({
      items: itemsRef.current,
      selectedItemIds: [...selectedItemIds()],
      focusedItemId: focusedItemIdRef.current,
    }),
    [selectedItemIds],
  );

  const replaceFlowNodes = useCallback((nextNodes: CanvasFlowNode[]) => {
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  }, []);

  const applyItems = useCallback(
    (
      nextItems: CanvasItem[],
      {
        editingItemId: requestedEditingItemId,
        selectedIds: requestedSelectedIds,
        focusedItemId: requestedFocusedItemId,
      }: ReplaceItemsOptions = {},
    ) => {
      const nextEditingItemId =
        requestedEditingItemId === undefined
          ? editingItemIdRef.current
          : requestedEditingItemId;
      const nextSelectedIds = requestedSelectedIds ?? selectedItemIds();
      const nextFocusedItemId =
        requestedFocusedItemId === undefined
          ? focusedItemIdRef.current
          : requestedFocusedItemId;

      itemsRef.current = nextItems;
      editingItemIdRef.current = nextEditingItemId;
      focusedItemIdRef.current = nextFocusedItemId;
      setItems(nextItems);
      setEditingItemId(nextEditingItemId);
      setFocusedItemId(nextFocusedItemId);
      replaceFlowNodes(
        canvasItemsToFlowNodes(
          nextItems,
          nextEditingItemId,
          nextSelectedIds,
          nextFocusedItemId,
        ),
      );
      persistItems(nextItems);
    },
    [persistItems, replaceFlowNodes, selectedItemIds],
  );

  const commitOperation = useCallback(
    (nextItems: CanvasItem[], options: ReplaceItemsOptions = {}) => {
      if (nextItems === itemsRef.current) return;
      recordHistory(currentSnapshot());
      applyItems(nextItems, options);
    },
    [applyItems, currentSnapshot, recordHistory],
  );

  const replaceSelection = useCallback(
    (
      nextSelectedIds: ReadonlySet<string>,
      nextFocusedItemId: string | null,
      nextFocusOrigin: CanvasFocusOrigin = focusOriginRef.current,
    ) => {
      focusedItemIdRef.current = nextFocusedItemId;
      focusOriginRef.current = nextFocusOrigin;
      setFocusedItemId(nextFocusedItemId);
      setFocusOrigin(nextFocusOrigin);
      replaceFlowNodes(
        nodesRef.current.map((node) => ({
          ...node,
          selected: nextSelectedIds.has(node.id),
          data: {
            ...node.data,
            isFocused: nextFocusedItemId === node.id,
          },
        })),
      );
    },
    [replaceFlowNodes],
  );

  const beginEditing = useCallback(
    (itemId: string) => {
      editingItemIdRef.current = itemId;
      setEditingItemId(itemId);
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
      replaceFlowNodes(
        canvasItemsToFlowNodes(
          itemsRef.current,
          itemId,
          new Set([itemId]),
          itemId,
        ),
      );
    },
    [replaceFlowNodes],
  );

  const preparePointerSelection = useCallback(
    (itemId: string, additive: boolean) => {
      pointerSelectionRef.current = {
        itemId,
        selectedIds: selectedItemIds(),
        additive,
      };
    },
    [selectedItemIds],
  );

  const cancelEditing = useCallback(
    (itemId: string) => {
      editingItemIdRef.current = null;
      setEditingItemId(null);
      focusedItemIdRef.current = itemId;
      setFocusedItemId(itemId);
      replaceFlowNodes(
        canvasItemsToFlowNodes(
          itemsRef.current,
          null,
          new Set([itemId]),
          itemId,
        ),
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
      commitOperation(
        itemsRef.current.map((item) =>
          item.id === itemId ? { ...item, text, updatedAt: now } : item,
        ),
        {
          editingItemId: null,
          selectedIds: new Set([itemId]),
          focusedItemId: itemId,
        },
      );
    },
    [cancelEditing, commitOperation],
  );

  const commitResize = useCallback(
    (itemId: string, bounds: CanvasNodeBounds) => {
      const current = itemsRef.current.find((item) => item.id === itemId);
      if (
        !current ||
        (current.x === bounds.x &&
          current.y === bounds.y &&
          current.width === bounds.width &&
          current.height === bounds.height)
      ) {
        return;
      }
      const now = Date.now();
      commitOperation(
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
        {
          selectedIds: selectedItemIds(),
          focusedItemId: itemId,
        },
      );
    },
    [commitOperation, selectedItemIds],
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
      commitOperation([...itemsRef.current, item], {
        editingItemId: item.id,
        selectedIds: new Set([item.id]),
        focusedItemId: item.id,
      });
    },
    [commitOperation],
  );

  const deleteSelection = useCallback(() => {
    const selectedIds = selectedItemIds();
    if (selectedIds.size === 0) return;
    const fallbackId = getSelectionFallbackAfterDeletion(
      itemsRef.current,
      selectedIds,
      focusedItemIdRef.current,
    );
    commitOperation(
      itemsRef.current.filter((item) => !selectedIds.has(item.id)),
      {
        editingItemId: null,
        selectedIds: fallbackId ? new Set([fallbackId]) : new Set(),
        focusedItemId: fallbackId,
      },
    );
  }, [commitOperation, selectedItemIds]);

  const duplicateSelection = useCallback(() => {
    const result = duplicateCanvasItems(itemsRef.current, selectedItemIds());
    if (result.duplicatedItemIds.length === 0) return;
    commitOperation(result.items, {
      editingItemId: null,
      selectedIds: new Set(result.duplicatedItemIds),
      focusedItemId: result.duplicatedItemIds[0],
    });
  }, [commitOperation, selectedItemIds]);

  const moveSelectionOneLayer = useCallback(
    (direction: CanvasLayerDirection) => {
      const selectedIds = selectedItemIds();
      const nextItems = moveCanvasItemsOneLayer(
        itemsRef.current,
        selectedIds,
        direction,
      );
      commitOperation(nextItems, {
        selectedIds,
        focusedItemId: focusedItemIdRef.current,
      });
    },
    [commitOperation, selectedItemIds],
  );

  const commitNodePositions = useCallback(() => {
    const now = Date.now();
    let changed = false;
    const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]));
    const nextItems = itemsRef.current.map((item) => {
      const node = nodeById.get(item.id);
      if (!node || sameBounds(item, node)) return item;
      changed = true;
      return updateItemFromFlowNode(item, node, now);
    });
    if (!changed) return;
    commitOperation(nextItems, {
      selectedIds: selectedItemIds(),
      focusedItemId: focusedItemIdRef.current,
    });
  }, [commitOperation, selectedItemIds]);

  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasFlowNode>[]) => {
      const nextNodes = applyNodeChanges(changes, nodesRef.current);
      const selectedNodes = nextNodes.filter((node) => node.selected);
      const newlySelectedId = changes.findLast(
        (change) => change.type === "select" && change.selected,
      )?.id;
      const nextFocusedItemId = newlySelectedId
        ? newlySelectedId
        : selectedNodes.some((node) => node.id === focusedItemIdRef.current)
          ? focusedItemIdRef.current
          : (selectedNodes.at(-1)?.id ?? null);

      focusedItemIdRef.current = nextFocusedItemId;
      setFocusedItemId(nextFocusedItemId);
      replaceFlowNodes(
        nextNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isFocused: nextFocusedItemId === node.id,
          },
        })),
      );
    },
    [replaceFlowNodes],
  );

  const focusItem = useCallback(
    (itemId: string) => {
      if (!selectedItemIds().has(itemId)) return;
      replaceSelection(selectedItemIds(), itemId);
    },
    [replaceSelection, selectedItemIds],
  );

  const completePointerSelection = useCallback(
    (itemId: string) => {
      const prepared = pointerSelectionRef.current;
      pointerSelectionRef.current = null;
      if (!prepared || prepared.itemId !== itemId || !prepared.additive) {
        if (selectedItemIds().has(itemId)) {
          replaceSelection(selectedItemIds(), itemId, "pointer");
        }
        return;
      }

      const nextSelectedIds = new Set(prepared.selectedIds);
      if (nextSelectedIds.has(itemId)) nextSelectedIds.delete(itemId);
      else nextSelectedIds.add(itemId);
      const nextFocusedItemId = nextSelectedIds.has(itemId)
        ? itemId
        : (Array.from(nextSelectedIds).at(-1) ?? null);
      replaceSelection(nextSelectedIds, nextFocusedItemId, "pointer");
    },
    [replaceSelection, selectedItemIds],
  );

  const selectOnly = useCallback(
    (itemId: string, origin: CanvasFocusOrigin = focusOriginRef.current) =>
      replaceSelection(new Set([itemId]), itemId, origin),
    [replaceSelection],
  );

  const syncFocusedItem = useCallback(
    (itemId: string, origin: CanvasFocusOrigin) => {
      const selectedIds = selectedItemIds();
      if (focusedItemIdRef.current === itemId && selectedIds.has(itemId)) {
        return;
      }
      replaceSelection(
        selectedIds.has(itemId) ? selectedIds : new Set([itemId]),
        itemId,
        origin,
      );
    },
    [replaceSelection, selectedItemIds],
  );

  const selectForKeyboardNavigation = useCallback(
    (itemId: string) => replaceSelection(new Set([itemId]), itemId, "keyboard"),
    [replaceSelection],
  );

  const markKeyboardInteraction = useCallback(() => {
    focusOriginRef.current = "keyboard";
    setFocusOrigin("keyboard");
  }, []);

  const clearSelection = useCallback(
    () => replaceSelection(new Set(), null, null),
    [replaceSelection],
  );

  const restoreHistorySnapshot = useCallback(
    (snapshot: CanvasHistorySnapshot) => {
      const availableIds = new Set(snapshot.items.map((item) => item.id));
      const selectedIds = new Set(
        snapshot.selectedItemIds.filter((id) => availableIds.has(id)),
      );
      const nextFocusedItemId =
        snapshot.focusedItemId && availableIds.has(snapshot.focusedItemId)
          ? snapshot.focusedItemId
          : (selectedIds.values().next().value ?? null);
      applyItems(snapshot.items, {
        editingItemId: null,
        selectedIds,
        focusedItemId: nextFocusedItemId,
      });
    },
    [applyItems],
  );

  const undo = useCallback(() => {
    const snapshot = undoHistory(currentSnapshot());
    if (snapshot) restoreHistorySnapshot(snapshot);
  }, [currentSnapshot, restoreHistorySnapshot, undoHistory]);

  const redo = useCallback(() => {
    const snapshot = redoHistory(currentSnapshot());
    if (snapshot) restoreHistorySnapshot(snapshot);
  }, [currentSnapshot, redoHistory, restoreHistorySnapshot]);

  const interaction = useMemo(
    () => ({
      beginEditing,
      cancelEditing,
      commitResize,
      commitText,
      preparePointerSelection,
      completePointerSelection,
      syncFocusedItem,
    }),
    [
      beginEditing,
      cancelEditing,
      commitResize,
      commitText,
      preparePointerSelection,
      completePointerSelection,
      syncFocusedItem,
    ],
  );

  const interactionState: CanvasInteractionState = {
    mode: editingItemId === null ? "navigation" : "editing",
    focusedItemId,
    selectedItemIds: nodes
      .filter((node) => node.selected)
      .map((node) => node.id),
    focusOrigin,
  };

  return {
    items,
    nodes,
    editingItemId,
    focusedItemId,
    focusOrigin,
    interactionState,
    selectedCount: nodes.filter((node) => node.selected).length,
    canUndo,
    canRedo,
    interaction,
    beginEditing,
    cancelEditing,
    createTextItem,
    deleteSelection,
    duplicateSelection,
    moveSelectionOneLayer,
    commitNodePositions,
    onNodesChange,
    focusItem,
    completePointerSelection,
    selectOnly,
    selectForKeyboardNavigation,
    markKeyboardInteraction,
    clearSelection,
    undo,
    redo,
  };
};
