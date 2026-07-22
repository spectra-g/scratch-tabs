import {
  getCanvasViewportCenter,
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
});
