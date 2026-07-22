import {
  getCanvasViewportCenter,
  getViewportToRevealCanvasBounds,
  screenPointToCanvasPoint,
} from "../canvasCoordinates";

describe("Canvas coordinate conversion", () => {
  it("converts screen points using pane offset, pan, and zoom", () => {
    expect(
      screenPointToCanvasPoint(
        { x: 450, y: 260 },
        { left: 50, top: 60 },
        { x: 100, y: -20, zoom: 2 },
      ),
    ).toEqual({ x: 150, y: 110 });
  });

  it("finds the viewport center in document coordinates", () => {
    expect(
      getCanvasViewportCenter(
        { left: 100, top: 50, width: 800, height: 600 },
        { x: -200, y: 100, zoom: 2 },
      ),
    ).toEqual({ x: 300, y: 100 });
  });

  it("does not recenter bounds that are already fully visible", () => {
    const viewport = { x: 20, y: 10, zoom: 1.5 };
    expect(
      getViewportToRevealCanvasBounds(
        { x: 100, y: 80, width: 200, height: 100 },
        { width: 800, height: 600 },
        viewport,
      ),
    ).toEqual(viewport);
  });

  it("pans only enough to reveal an offscreen item and preserves zoom", () => {
    expect(
      getViewportToRevealCanvasBounds(
        { x: 700, y: -100, width: 200, height: 100 },
        { width: 800, height: 600 },
        { x: 0, y: 0, zoom: 1.5 },
      ),
    ).toEqual({ x: -582, y: 182, zoom: 1.5 });
  });

  it("aligns an oversized item to the reveal padding without changing zoom", () => {
    expect(
      getViewportToRevealCanvasBounds(
        { x: 100, y: 100, width: 1000, height: 800 },
        { width: 600, height: 400 },
        { x: 0, y: 0, zoom: 1 },
      ),
    ).toEqual({ x: -68, y: -68, zoom: 1 });
  });
});
