import {
  CANVAS_NUDGE_GRID_SIZE,
  CANVAS_NUDGE_LARGE_MULTIPLIER,
} from "../constants";
import type { CanvasNavigationDirection } from "./canvasSpatialNavigation";
import type { CanvasPoint } from "./canvasItemFactory";

export type CanvasKeyboardPlatform = "mac" | "other";

export type CanvasKeyboardCommand =
  | { type: "navigate"; direction: CanvasNavigationDirection }
  | { type: "traverse"; backwards: boolean }
  | { type: "nudge"; direction: CanvasNavigationDirection; distance: number }
  | {
      type:
        | "delete"
        | "duplicate"
        | "select-all"
        | "undo"
        | "redo"
        | "enter"
        | "escape"
        | "fit"
        | "reset-zoom"
        | "start-pan"
        | "show-shortcuts";
    };

interface CanvasKeyboardEventLike {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface CanvasComposedPathEvent {
  composedPath(): EventTarget[];
}

const directionByKey: Partial<Record<string, CanvasNavigationDirection>> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
};

export const getCanvasKeyboardPlatform = (): CanvasKeyboardPlatform => {
  if (typeof navigator === "undefined") return "other";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "mac" : "other";
};

export const hasCanvasPrimaryModifier = (
  event: Pick<CanvasKeyboardEventLike, "ctrlKey" | "metaKey">,
  platform: CanvasKeyboardPlatform,
): boolean =>
  platform === "mac"
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;

export const isCanvasEditableEvent = (
  event: CanvasComposedPathEvent,
): boolean =>
  event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches(
            'input, textarea, select, [role="textbox"], [role="combobox"]',
          )),
    );

export const isCanvasInteractiveControlEvent = (
  event: CanvasComposedPathEvent,
): boolean =>
  event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        target.matches(
          'button, a[href], [role="button"], [role="menuitem"], [role="option"]',
        ),
    );

export const getCanvasNudgeDelta = (
  direction: CanvasNavigationDirection,
  distance: number,
): CanvasPoint => {
  switch (direction) {
    case "up":
      return { x: 0, y: -distance };
    case "right":
      return { x: distance, y: 0 };
    case "down":
      return { x: 0, y: distance };
    case "left":
      return { x: -distance, y: 0 };
  }
};

export const getCanvasKeyboardCommand = (
  event: CanvasKeyboardEventLike,
  platform: CanvasKeyboardPlatform = getCanvasKeyboardPlatform(),
): CanvasKeyboardCommand | null => {
  const direction = directionByKey[event.key];
  const primaryModifier = hasCanvasPrimaryModifier(event, platform);
  const hasAnyCommandModifier = event.ctrlKey || event.metaKey;
  const lowerKey = event.key.toLowerCase();

  if (direction && event.altKey && !event.ctrlKey && !event.metaKey) {
    return {
      type: "nudge",
      direction,
      distance:
        CANVAS_NUDGE_GRID_SIZE *
        (event.shiftKey ? CANVAS_NUDGE_LARGE_MULTIPLIER : 1),
    };
  }

  if (direction && !event.altKey && !hasAnyCommandModifier && !event.shiftKey) {
    return { type: "navigate", direction };
  }

  if (event.key === "Tab" && !event.altKey && !hasAnyCommandModifier) {
    return { type: "traverse", backwards: event.shiftKey };
  }

  if (primaryModifier && !event.altKey) {
    if (lowerKey === "z") {
      return { type: event.shiftKey ? "redo" : "undo" };
    }
    if (lowerKey === "y" && !event.shiftKey) return { type: "redo" };
    if (lowerKey === "d" && !event.shiftKey) return { type: "duplicate" };
    if (lowerKey === "a" && !event.shiftKey) return { type: "select-all" };

    // ClipboardEvent handlers own Canvas copy/cut/paste so the browser can
    // provide both custom Canvas data and a plain-text fallback.
    if (["c", "x", "v"].includes(lowerKey)) return null;
  }

  if (event.altKey || hasAnyCommandModifier) return null;
  if (event.key === "Delete" || event.key === "Backspace") {
    return { type: "delete" };
  }
  if (event.key === "Enter") return { type: "enter" };
  if (event.key === "Escape") return { type: "escape" };
  if (event.key === " " || event.key === "Spacebar") {
    return { type: "start-pan" };
  }
  if (lowerKey === "f" && !event.shiftKey) return { type: "fit" };
  if (event.key === "0" && !event.shiftKey) return { type: "reset-zoom" };
  if (event.key === "?") return { type: "show-shortcuts" };

  return null;
};
