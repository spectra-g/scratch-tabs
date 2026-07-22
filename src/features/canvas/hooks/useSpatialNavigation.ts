import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react";
import type { CanvasInteractionState, CanvasItem } from "../types";
import { getCanvasItemAccessibleLabel } from "../utils/canvasAccessibility";
import {
  findDirectionalCanvasNeighbor,
  getCanvasSpatialReadingOrder,
  type CanvasNavigationDirection,
} from "../utils/canvasSpatialNavigation";

interface UseSpatialNavigationOptions {
  rootRef: RefObject<HTMLDivElement>;
  items: CanvasItem[];
  interactionState: CanvasInteractionState;
  selectForKeyboardNavigation: (itemId: string) => void;
  beginEditing: (itemId: string) => void;
  clearSelection: () => void;
  revealItem: (item: CanvasItem) => void;
}

const focusCardElement = (root: HTMLElement | null, itemId: string): void => {
  const card = Array.from(
    root?.querySelectorAll<HTMLElement>("[data-item-id]") ?? [],
  ).find((element) => element.dataset.itemId === itemId);
  card?.focus({ preventScroll: true });
};

export const useSpatialNavigation = ({
  rootRef,
  items,
  interactionState,
  selectForKeyboardNavigation,
  beginEditing,
  clearSelection,
  revealItem,
}: UseSpatialNavigationOptions) => {
  const [announcement, setAnnouncement] = useState("");
  const [edgeDirection, setEdgeDirection] =
    useState<CanvasNavigationDirection | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRootEntryRef = useRef(false);
  const lastAnnouncedItemIdRef = useRef<string | null>(null);
  const readingOrder = useMemo(
    () => getCanvasSpatialReadingOrder(items),
    [items],
  );
  const { mode, focusOrigin, focusedItemId } = interactionState;

  const focusForNavigation = useCallback(
    (item: CanvasItem) => {
      selectForKeyboardNavigation(item.id);
      requestAnimationFrame(() => focusCardElement(rootRef.current, item.id));
    },
    [rootRef, selectForKeyboardNavigation],
  );

  useEffect(() => {
    if (mode !== "navigation" || focusOrigin !== "keyboard" || !focusedItemId) {
      lastAnnouncedItemIdRef.current = null;
      return;
    }

    if (lastAnnouncedItemIdRef.current === focusedItemId) return;

    const item = items.find((candidate) => candidate.id === focusedItemId);
    if (!item) return;

    lastAnnouncedItemIdRef.current = focusedItemId;
    focusCardElement(rootRef.current, item.id);
    revealItem(item);
    setAnnouncement(getCanvasItemAccessibleLabel(item));
  }, [focusOrigin, focusedItemId, items, mode, revealItem, rootRef]);

  useEffect(
    () => () => {
      if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);
    },
    [],
  );

  const showEdgeFeedback = useCallback(
    (direction: CanvasNavigationDirection, isRepeated: boolean) => {
      setEdgeDirection(direction);
      if (!isRepeated) setAnnouncement(`No card further ${direction}`);
      if (edgeTimerRef.current) clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = setTimeout(() => setEdgeDirection(null), 180);
    },
    [],
  );

  const focusCanvasRoot = useCallback(() => {
    suppressRootEntryRef.current = true;
    clearSelection();
    requestAnimationFrame(() =>
      rootRef.current?.focus({ preventScroll: true }),
    );
  }, [clearSelection, rootRef]);

  const handleRootFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (suppressRootEntryRef.current) {
        suppressRootEntryRef.current = false;
        return;
      }
      if (!focusedItemId && readingOrder[0]) {
        focusForNavigation(readingOrder[0]);
      }
    },
    [focusForNavigation, focusedItemId, readingOrder],
  );

  const navigateDirection = useCallback(
    (direction: CanvasNavigationDirection, isRepeated: boolean) => {
      const focusedItem = focusedItemId
        ? items.find((item) => item.id === focusedItemId)
        : null;
      if (!focusedItem) return;
      const neighbor = findDirectionalCanvasNeighbor(
        items,
        focusedItem.id,
        direction,
      );
      if (neighbor) focusForNavigation(neighbor);
      else showEdgeFeedback(direction, isRepeated);
    },
    [focusForNavigation, focusedItemId, items, showEdgeFeedback],
  );

  const navigateSequentially = useCallback(
    (backwards: boolean): boolean => {
      if (!focusedItemId) return false;
      const currentIndex = readingOrder.findIndex(
        (item) => item.id === focusedItemId,
      );
      const nextItem = readingOrder[currentIndex + (backwards ? -1 : 1)];
      if (!nextItem) return false;
      focusForNavigation(nextItem);
      return true;
    },
    [focusedItemId, focusForNavigation, readingOrder],
  );

  const enterFocusedItem = useCallback(() => {
    if (!focusedItemId) return;
    beginEditing(focusedItemId);
  }, [beginEditing, focusedItemId]);

  const escapeNavigation = useCallback(() => {
    if (interactionState.selectedItemIds.length > 1 && focusedItemId) {
      selectForKeyboardNavigation(focusedItemId);
    } else {
      focusCanvasRoot();
    }
  }, [
    focusCanvasRoot,
    focusedItemId,
    interactionState.selectedItemIds.length,
    selectForKeyboardNavigation,
  ]);

  return {
    announcement,
    edgeDirection,
    handleRootFocus,
    navigateDirection,
    navigateSequentially,
    enterFocusedItem,
    escapeNavigation,
    announce: setAnnouncement,
  };
};
