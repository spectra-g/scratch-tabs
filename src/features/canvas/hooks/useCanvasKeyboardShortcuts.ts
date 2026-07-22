import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CanvasInteractionState } from "../types";
import {
  getCanvasKeyboardCommand,
  isCanvasEditableEvent,
  isCanvasInteractiveControlEvent,
} from "../utils/canvasKeyboard";
import type { CanvasNavigationDirection } from "../utils/canvasSpatialNavigation";

interface UseCanvasKeyboardShortcutsOptions {
  interactionState: CanvasInteractionState;
  itemCount: number;
  markKeyboardInteraction: () => void;
  navigateDirection: (
    direction: CanvasNavigationDirection,
    isRepeated: boolean,
  ) => void;
  navigateSequentially: (backwards: boolean) => boolean;
  enterFocusedItem: () => void;
  escapeNavigation: () => void;
  selectAll: () => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  nudgeSelection: (
    direction: CanvasNavigationDirection,
    distance: number,
  ) => void;
  undo: () => void;
  redo: () => void;
  fitSelection: () => void;
  resetZoom: () => void;
  announce: (message: string) => void;
}

const selectionAnnouncement = (count: number): string =>
  count === 1 ? "1 card selected" : `${count} cards selected`;

const cardCountAnnouncement = (count: number): string =>
  count === 1 ? "1 card" : `${count} cards`;

export const useCanvasKeyboardShortcuts = ({
  interactionState,
  itemCount,
  markKeyboardInteraction,
  navigateDirection,
  navigateSequentially,
  enterFocusedItem,
  escapeNavigation,
  selectAll,
  deleteSelection,
  duplicateSelection,
  nudgeSelection,
  undo,
  redo,
  fitSelection,
  resetZoom,
  announce,
}: UseCanvasKeyboardShortcutsOptions) => {
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const focusBeforeHelpRef = useRef<HTMLElement | null>(null);

  const showShortcutHelp = useCallback(() => {
    focusBeforeHelpRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setIsShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setIsShortcutHelpOpen(false);
    const focusTarget = focusBeforeHelpRef.current;
    requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!isSpacePanning) return;
    const stopPanning = (event: globalThis.KeyboardEvent) => {
      if (event.key === " " || event.key === "Spacebar") {
        setIsSpacePanning(false);
      }
    };
    const stopPanningOnWindowBlur = () => setIsSpacePanning(false);
    window.addEventListener("keyup", stopPanning);
    window.addEventListener("blur", stopPanningOnWindowBlur);
    return () => {
      window.removeEventListener("keyup", stopPanning);
      window.removeEventListener("blur", stopPanningOnWindowBlur);
    };
  }, [isSpacePanning]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isShortcutHelpOpen) {
        if (event.key === "Escape" || event.key === "?") {
          event.preventDefault();
          event.stopPropagation();
          closeShortcutHelp();
        }
        return;
      }

      if (
        interactionState.mode === "editing" ||
        isCanvasEditableEvent(event.nativeEvent) ||
        isCanvasInteractiveControlEvent(event.nativeEvent)
      ) {
        return;
      }

      const command = getCanvasKeyboardCommand(event);
      if (!command) return;

      if (command.type === "traverse") {
        if (!navigateSequentially(command.backwards)) return;
      }

      event.preventDefault();
      event.stopPropagation();
      markKeyboardInteraction();

      switch (command.type) {
        case "navigate":
          navigateDirection(command.direction, event.repeat);
          break;
        case "traverse":
          break;
        case "enter":
          enterFocusedItem();
          break;
        case "escape":
          escapeNavigation();
          break;
        case "select-all":
          selectAll();
          if (!event.repeat) announce(selectionAnnouncement(itemCount));
          break;
        case "duplicate": {
          const count = interactionState.selectedItemIds.length;
          duplicateSelection();
          if (count > 0 && !event.repeat) {
            announce(`Duplicated ${count}. ${selectionAnnouncement(count)}`);
          }
          break;
        }
        case "delete": {
          const count = interactionState.selectedItemIds.length;
          deleteSelection();
          if (count > 0 && !event.repeat) {
            announce(count === 1 ? "Deleted 1 card" : `Deleted ${count} cards`);
          }
          break;
        }
        case "nudge":
          nudgeSelection(command.direction, command.distance);
          if (!event.repeat && interactionState.selectedItemIds.length > 0) {
            announce(
              `Moved ${cardCountAnnouncement(
                interactionState.selectedItemIds.length,
              )}`,
            );
          }
          break;
        case "undo":
          undo();
          if (!event.repeat) announce("Undid Canvas operation");
          break;
        case "redo":
          redo();
          if (!event.repeat) announce("Redid Canvas operation");
          break;
        case "fit":
          fitSelection();
          break;
        case "reset-zoom":
          resetZoom();
          break;
        case "start-pan":
          setIsSpacePanning(true);
          break;
        case "show-shortcuts":
          showShortcutHelp();
          break;
      }
    },
    [
      announce,
      closeShortcutHelp,
      deleteSelection,
      duplicateSelection,
      enterFocusedItem,
      escapeNavigation,
      fitSelection,
      interactionState,
      isShortcutHelpOpen,
      itemCount,
      markKeyboardInteraction,
      navigateDirection,
      navigateSequentially,
      nudgeSelection,
      redo,
      resetZoom,
      selectAll,
      showShortcutHelp,
      undo,
    ],
  );

  const handleKeyUp = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== " " && event.key !== "Spacebar") return;
    event.preventDefault();
    event.stopPropagation();
    setIsSpacePanning(false);
  }, []);

  return {
    isSpacePanning,
    isShortcutHelpOpen,
    showShortcutHelp,
    closeShortcutHelp,
    handleKeyDown,
    handleKeyUp,
  };
};
