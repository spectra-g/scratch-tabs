import {
  planDerivedPosition,
  TRANSFORM_DERIVED_GAP_X,
  TRANSFORM_DERIVED_GAP_Y,
  DERIVED_ITEM_SIZE,
} from "../transformLayout";
import { DEFAULT_CODE_ITEM_HEIGHT } from "../../constants";

describe("transformLayout", () => {
  it("places the first output to the right of its source", () => {
    const position = planDerivedPosition(
      { x: 10, y: 20, width: 280 },
      0,
    );
    expect(position).toEqual({ x: 10 + 280 + TRANSFORM_DERIVED_GAP_X, y: 20 });
  });

  it("stacks fan-out outputs vertically", () => {
    const first = planDerivedPosition({ x: 0, y: 0, width: 100 }, 0);
    const second = planDerivedPosition({ x: 0, y: 0, width: 100 }, 1);
    expect(second.y - first.y).toBe(
      DEFAULT_CODE_ITEM_HEIGHT + TRANSFORM_DERIVED_GAP_Y,
    );
  });

  it("exposes the default derived card size", () => {
    expect(DERIVED_ITEM_SIZE.width).toBeGreaterThan(0);
    expect(DERIVED_ITEM_SIZE.height).toBeGreaterThan(0);
  });
});
