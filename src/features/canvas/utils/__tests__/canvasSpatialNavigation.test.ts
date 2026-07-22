import type { CanvasTextItem } from "../../types";
import {
  findDirectionalCanvasNeighbor,
  getCanvasSpatialReadingOrder,
  type CanvasNavigationDirection,
} from "../canvasSpatialNavigation";

const item = (
  id: string,
  x: number,
  y: number,
  overrides: Partial<CanvasTextItem> = {},
): CanvasTextItem => ({
  id,
  type: "text",
  x,
  y,
  width: 100,
  height: 80,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  text: id,
  ...overrides,
});

describe("findDirectionalCanvasNeighbor", () => {
  it.each<{
    name: string;
    direction: CanvasNavigationDirection;
    candidates: CanvasTextItem[];
    expected: string | null;
  }>([
    {
      name: "aligned row",
      direction: "right",
      candidates: [item("near", 130, 0), item("far", 300, 0)],
      expected: "near",
    },
    {
      name: "aligned column",
      direction: "up",
      candidates: [item("near", 0, -100), item("far", 0, -250)],
      expected: "near",
    },
    {
      name: "aligned card favored over a modestly closer diagonal card",
      direction: "right",
      candidates: [item("diagonal", 120, 150), item("aligned", 250, 0)],
      expected: "aligned",
    },
    {
      name: "overlapping cards",
      direction: "right",
      candidates: [item("stable-first", 100, 0), item("stable-second", 140, 0)],
      expected: "stable-first",
    },
    {
      name: "differently sized cards ranked by their bounds gap",
      direction: "right",
      candidates: [
        item("close-edge", 210, 0, { width: 20 }),
        item("close-center", 250, 0, { width: 400 }),
      ],
      expected: "close-edge",
    },
    {
      name: "negative document coordinates",
      direction: "left",
      candidates: [item("near", -240, -40), item("far", -500, -40)],
      expected: "near",
    },
    {
      name: "no candidate in the requested half-plane",
      direction: "down",
      candidates: [item("above", 0, -200), item("left", -200, 0)],
      expected: null,
    },
  ])("handles $name", ({ direction, candidates, expected }) => {
    const origin = item("origin", 0, 0, { width: 200, height: 100 });
    expect(
      findDirectionalCanvasNeighbor(
        [origin, ...candidates],
        origin.id,
        direction,
      )?.id ?? null,
    ).toBe(expected);
  });

  it("resolves equal scores by z-index, creation time, then item ID", () => {
    const origin = item("origin", 0, 0);
    const tied = [
      item("z-later", 150, 0, { zIndex: 2, createdAt: 0 }),
      item("created-later", 150, 0, { zIndex: 1, createdAt: 2 }),
      item("id-b", 150, 0, { zIndex: 1, createdAt: 1 }),
      item("id-a", 150, 0, { zIndex: 1, createdAt: 1 }),
    ];

    expect(
      findDirectionalCanvasNeighbor([origin, ...tied], "origin", "right")?.id,
    ).toBe("id-a");
  });
});

describe("getCanvasSpatialReadingOrder", () => {
  it("groups vertical overlaps and near rows before ordering left-to-right", () => {
    const items = [
      item("second-row-right", 250, 160),
      item("first-row-right", 200, 20),
      item("second-row-left", -40, 150),
      item("first-row-left", -100, 0),
    ];

    expect(getCanvasSpatialReadingOrder(items).map(({ id }) => id)).toEqual([
      "first-row-left",
      "first-row-right",
      "second-row-left",
      "second-row-right",
    ]);
  });

  it("uses deterministic stable fields for coincident cards", () => {
    const items = [
      item("id-b", 0, 0, { zIndex: 1, createdAt: 1 }),
      item("created-later", 0, 0, { zIndex: 1, createdAt: 2 }),
      item("z-later", 0, 0, { zIndex: 2, createdAt: 0 }),
      item("id-a", 0, 0, { zIndex: 1, createdAt: 1 }),
    ];

    expect(getCanvasSpatialReadingOrder(items).map(({ id }) => id)).toEqual([
      "id-a",
      "id-b",
      "created-later",
      "z-later",
    ]);
  });

  it("recomputes after a completed geometry change and reverses exactly", () => {
    const before = [item("one", 0, 0), item("two", 150, 0)];
    const after = [before[0], { ...before[1], x: -150 }];
    const order = getCanvasSpatialReadingOrder(after);

    expect(getCanvasSpatialReadingOrder(before).map(({ id }) => id)).toEqual([
      "one",
      "two",
    ]);
    expect(order.map(({ id }) => id)).toEqual(["two", "one"]);
    expect([...order].reverse().map(({ id }) => id)).toEqual(["one", "two"]);
  });
});
