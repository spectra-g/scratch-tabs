import type { CanvasTextItem } from "../../types";
import {
  keepCanvasIngestItemsInViewport,
  layoutCanvasIngestItems,
} from "../canvasIngestLayout";

const item = (id: string, width: number, height: number): CanvasTextItem => ({
  id,
  type: "text",
  x: 0,
  y: 0,
  width,
  height,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  text: id,
});

describe("Canvas ingestion layout", () => {
  it("uses a deterministic compact grid for mixed card sizes", () => {
    const laidOut = layoutCanvasIngestItems(
      [item("one", 100, 50), item("two", 200, 70), item("three", 80, 60)],
      { x: 10, y: 20 },
    );

    expect(laidOut.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 10, y: 20 },
      { x: 142, y: 20 },
      { x: 10, y: 122 },
    ]);
  });

  it("shifts a fitting group just enough to stay inside the current viewport", () => {
    const positioned = keepCanvasIngestItemsInViewport(
      layoutCanvasIngestItems([item("one", 100, 50), item("two", 200, 70)], {
        x: 900,
        y: 700,
      }),
      { width: 800, height: 600 },
      { x: 0, y: 0, zoom: 1 },
    );

    expect(positioned.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 444, y: 506 },
      { x: 576, y: 506 },
    ]);
  });

  it("performs viewport clamping in document coordinates at non-default zoom", () => {
    const positioned = keepCanvasIngestItemsInViewport(
      [item("one", 100, 50)],
      { width: 800, height: 600 },
      { x: -200, y: -100, zoom: 2 },
    );

    expect(positioned[0]).toEqual(expect.objectContaining({ x: 112, y: 62 }));
  });
});
