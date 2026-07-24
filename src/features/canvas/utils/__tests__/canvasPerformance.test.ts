import { CANVAS_VISIBLE_ELEMENTS_THRESHOLD } from "../../constants";
import { shouldRenderOnlyVisibleCanvasItems } from "../canvasPerformance";

describe("Canvas performance policy", () => {
  it("keeps small boards fully rendered for predictable interaction", () => {
    expect(
      shouldRenderOnlyVisibleCanvasItems(CANVAS_VISIBLE_ELEMENTS_THRESHOLD - 1),
    ).toBe(false);
  });

  it("limits rendering to visible cards for large boards", () => {
    expect(
      shouldRenderOnlyVisibleCanvasItems(CANVAS_VISIBLE_ELEMENTS_THRESHOLD),
    ).toBe(true);
    expect(shouldRenderOnlyVisibleCanvasItems(1_000)).toBe(true);
  });
});
