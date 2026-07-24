import { resolveCanvasPaneWidth } from "../canvasPaneWidth";

describe("resolveCanvasPaneWidth", () => {
  it("uses a positive ResizeObserver width", () => {
    expect(
      resolveCanvasPaneWidth({
        observedWidth: 720,
        measuredWidth: 700,
        previousWidth: 680,
      }),
    ).toBe(720);
  });

  it("falls back to a positive bounding rectangle measurement", () => {
    expect(
      resolveCanvasPaneWidth({
        observedWidth: 0,
        measuredWidth: 700,
        previousWidth: 680,
      }),
    ).toBe(700);
  });

  it("retains the previous meaningful width while the pane is hidden", () => {
    expect(
      resolveCanvasPaneWidth({
        observedWidth: 0,
        measuredWidth: 0,
        previousWidth: 700,
      }),
    ).toBe(700);
  });

  it("remains unmeasured when every available width is non-positive", () => {
    expect(
      resolveCanvasPaneWidth({
        observedWidth: 0,
        measuredWidth: 0,
        previousWidth: null,
      }),
    ).toBeNull();
  });
});
