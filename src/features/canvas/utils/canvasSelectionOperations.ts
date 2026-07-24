import { CANVAS_DUPLICATE_OFFSET } from "../constants";
import type { CanvasItem } from "../types";
import { getCanvasSpatialReadingOrder } from "./canvasSpatialNavigation";

export type CanvasLayerDirection = "forward" | "backward";

const compareLayerOrder = (left: CanvasItem, right: CanvasItem): number =>
  left.zIndex - right.zIndex ||
  left.createdAt - right.createdAt ||
  left.id.localeCompare(right.id);

export const duplicateCanvasItems = (
  items: CanvasItem[],
  selectedItemIds: ReadonlySet<string>,
  options: {
    createId?: () => string;
    now?: number;
    offset?: number;
  } = {},
): { items: CanvasItem[]; duplicatedItemIds: string[] } => {
  const selected = items.filter((item) => selectedItemIds.has(item.id));
  if (selected.length === 0) {
    return { items, duplicatedItemIds: [] };
  }

  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? Date.now();
  const offset = options.offset ?? CANVAS_DUPLICATE_OFFSET;
  const topZIndex = Math.max(0, ...items.map((item) => item.zIndex));
  const duplicates = selected.map(
    (item, index): CanvasItem => ({
      ...item,
      id: createId(),
      x: item.x + offset,
      y: item.y + offset,
      zIndex: topZIndex + index + 1,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return {
    items: [...items, ...duplicates],
    duplicatedItemIds: duplicates.map((item) => item.id),
  };
};

export const moveCanvasItemsOneLayer = (
  items: CanvasItem[],
  selectedItemIds: ReadonlySet<string>,
  direction: CanvasLayerDirection,
  now = Date.now(),
): CanvasItem[] => {
  if (selectedItemIds.size === 0) return items;

  const ordered = [...items].sort(compareLayerOrder);
  let changed = false;

  if (direction === "forward") {
    for (let index = ordered.length - 2; index >= 0; index -= 1) {
      if (
        selectedItemIds.has(ordered[index].id) &&
        !selectedItemIds.has(ordered[index + 1].id)
      ) {
        [ordered[index], ordered[index + 1]] = [
          ordered[index + 1],
          ordered[index],
        ];
        changed = true;
      }
    }
  } else {
    for (let index = 1; index < ordered.length; index += 1) {
      if (
        selectedItemIds.has(ordered[index].id) &&
        !selectedItemIds.has(ordered[index - 1].id)
      ) {
        [ordered[index - 1], ordered[index]] = [
          ordered[index],
          ordered[index - 1],
        ];
        changed = true;
      }
    }
  }

  if (!changed) return items;

  const zIndexById = new Map(
    ordered.map((item, index) => [item.id, index + 1]),
  );
  return items.map((item) => {
    const zIndex = zIndexById.get(item.id) ?? item.zIndex;
    return zIndex === item.zIndex ? item : { ...item, zIndex, updatedAt: now };
  });
};

export const getSelectionFallbackAfterDeletion = (
  items: CanvasItem[],
  deletedItemIds: ReadonlySet<string>,
  focusedItemId: string | null,
): string | null => {
  if (items.length === deletedItemIds.size) return null;

  const readingOrder = getCanvasSpatialReadingOrder(items);
  const focusedIndex = focusedItemId
    ? readingOrder.findIndex((item) => item.id === focusedItemId)
    : -1;
  if (focusedIndex >= 0) {
    for (
      let index = focusedIndex + 1;
      index < readingOrder.length;
      index += 1
    ) {
      if (!deletedItemIds.has(readingOrder[index].id)) {
        return readingOrder[index].id;
      }
    }
    for (let index = focusedIndex - 1; index >= 0; index -= 1) {
      if (!deletedItemIds.has(readingOrder[index].id)) {
        return readingOrder[index].id;
      }
    }
  }

  return readingOrder.find((item) => !deletedItemIds.has(item.id))?.id ?? null;
};
