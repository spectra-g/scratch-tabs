import {
  DEFAULT_CODE_ITEM_HEIGHT,
  DEFAULT_CODE_ITEM_WIDTH,
} from "../constants";

/** Horizontal gap between a source card and its derived quick-transform output. */
export const TRANSFORM_DERIVED_GAP_X = 96;

/** Vertical gap between stacked fan-out outputs of the same source. */
export const TRANSFORM_DERIVED_GAP_Y = 32;

export interface DerivedPositionInput {
  x: number;
  y: number;
  width: number;
}

/**
 * Position for a derived quick-transform card: to the right of its source,
 * stacked vertically by how many outputs the source already has (fan-out).
 */
export const planDerivedPosition = (
  source: DerivedPositionInput,
  siblingCount: number,
): { x: number; y: number } => ({
  x: source.x + source.width + TRANSFORM_DERIVED_GAP_X,
  y: source.y + siblingCount * (DEFAULT_CODE_ITEM_HEIGHT + TRANSFORM_DERIVED_GAP_Y),
});

export const DERIVED_ITEM_SIZE = {
  width: DEFAULT_CODE_ITEM_WIDTH,
  height: DEFAULT_CODE_ITEM_HEIGHT,
} as const;
