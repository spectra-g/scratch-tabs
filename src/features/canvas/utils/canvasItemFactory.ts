import {
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../constants";
import type { CanvasTextItem } from "../types";

export interface CanvasPoint {
  x: number;
  y: number;
}

export const createTextCanvasItem = ({
  position,
  zIndex,
  text = "",
  now = Date.now(),
  id = crypto.randomUUID(),
}: {
  position: CanvasPoint;
  zIndex: number;
  text?: string;
  now?: number;
  id?: string;
}): CanvasTextItem => ({
  id,
  type: "text",
  x: position.x,
  y: position.y,
  width: DEFAULT_TEXT_ITEM_WIDTH,
  height: DEFAULT_TEXT_ITEM_HEIGHT,
  zIndex,
  createdAt: now,
  updatedAt: now,
  text,
});
