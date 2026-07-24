import { CANVAS_VISIBLE_ELEMENTS_THRESHOLD } from "../constants";

export const shouldRenderOnlyVisibleCanvasItems = (
  itemCount: number,
): boolean => itemCount >= CANVAS_VISIBLE_ELEMENTS_THRESHOLD;
