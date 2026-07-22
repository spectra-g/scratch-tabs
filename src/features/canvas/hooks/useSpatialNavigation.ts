import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
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
  markKeyboardInteraction: () => void;
  beginEditing: (itemId: string) => void;
  clearSelection: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  undo: () => void;
  redo: () => void;
  revealItem: (item: CanvasItem) => void;
}

const directionByKey: Partial<Record<string, CanvasNavigationDirection>> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
};

const isEditableEventTarget = (event: KeyboardEvent): boolean =>
  event.nativeEvent
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches(
            'input, textarea, select, [role="textbox"], [role="combobox"]',
          )),
    );

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
  markKeyboardInteraction,
  beginEditing,
  clearSelection,
  deleteSelection,
  duplicateSelection,
  undo,
  redo,
  revealItem,
}: UseSpatialNavigationOptions) => {
  const [announcement, setAnnouncement] = useState("");
  const [edgeDirection, setEdgeDirection] =
    useState<CanvasNavigationDirection | null>(null);
  const edgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRootEntryRef = useRef(false);
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
      return;
    }

    const item = items.find((candidate) => candidate.id === focusedItemId);
    if (!item) return;

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isEditableEventTarget(event) || interactionState.mode === "editing") {
        return;
      }

      const commandKey = event.metaKey || event.ctrlKey;
      const focusedItemId = interactionState.focusedItemId;
      const focusedItem = focusedItemId
        ? items.find((item) => item.id === focusedItemId)
        : null;
      const direction = directionByKey[event.key];

      if (direction && !event.altKey && !commandKey) {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        if (!focusedItem) return;
        const neighbor = findDirectionalCanvasNeighbor(
          items,
          focusedItem.id,
          direction,
        );
        if (neighbor) focusForNavigation(neighbor);
        else showEdgeFeedback(direction, event.repeat);
        return;
      }

      if (event.key === "Tab" && focusedItem) {
        const currentIndex = readingOrder.findIndex(
          (item) => item.id === focusedItem.id,
        );
        const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
        const nextItem = readingOrder[nextIndex];
        if (nextItem) {
          event.preventDefault();
          event.stopPropagation();
          markKeyboardInteraction();
          focusForNavigation(nextItem);
        }
        return;
      }

      if (commandKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        if (event.shiftKey) redo();
        else undo();
      } else if (commandKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        redo();
      } else if (commandKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        duplicateSelection();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        deleteSelection();
      } else if (event.key === "Enter" && focusedItem) {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        beginEditing(focusedItem.id);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        markKeyboardInteraction();
        if (
          interactionState.selectedItemIds.length > 1 &&
          interactionState.focusedItemId
        ) {
          selectForKeyboardNavigation(interactionState.focusedItemId);
        } else {
          focusCanvasRoot();
        }
      }
    },
    [
      beginEditing,
      deleteSelection,
      duplicateSelection,
      focusCanvasRoot,
      focusForNavigation,
      interactionState,
      items,
      markKeyboardInteraction,
      readingOrder,
      redo,
      selectForKeyboardNavigation,
      showEdgeFeedback,
      undo,
    ],
  );

  return {
    announcement,
    edgeDirection,
    handleKeyDown,
    handleRootFocus,
  };
};
