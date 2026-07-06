import { getCenteredViewport, getImagePointFromClient } from "../utils/viewport";

describe("getImagePointFromClient", () => {
  const viewport = { zoom: 2, offsetX: 10, offsetY: 20 };
  const rect = { left: 100, top: 50 };
  const image = { width: 40, height: 30 };

  it("returns null outside image bounds when clamping is disabled", () => {
    expect(getImagePointFromClient(rect, viewport, image, 80, 40, { clamp: false })).toBeNull();
  });

  it("clamps outside points to the nearest image edge", () => {
    expect(getImagePointFromClient(rect, viewport, image, 80, 40, { clamp: true })).toEqual({
      x: 0,
      y: 0,
    });
    expect(getImagePointFromClient(rect, viewport, image, 500, 500, { clamp: true })).toEqual({
      x: 39,
      y: 29,
    });
  });
});

describe("getCenteredViewport", () => {
  it("centers using the clamped zoom", () => {
    expect(
      getCenteredViewport(
        { width: 100, height: 100 },
        { width: 10000, height: 10000 },
        0.01,
      ),
    ).toEqual({
      zoom: 0.05,
      offsetX: -200,
      offsetY: -200,
    });
  });
});
