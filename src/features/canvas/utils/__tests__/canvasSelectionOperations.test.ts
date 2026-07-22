import type { CanvasTextItem } from "../../types";
import {
  duplicateCanvasItems,
  getSelectionFallbackAfterDeletion,
  moveCanvasItemsOneLayer,
} from "../canvasSelectionOperations";

const makeItem = (id: string, zIndex: number): CanvasTextItem => ({
  id,
  type: "text",
  x: zIndex * 10,
  y: zIndex * 20,
  width: 280,
  height: 180,
  zIndex,
  createdAt: zIndex,
  updatedAt: zIndex,
  text: id,
});

describe("canvasSelectionOperations", () => {
  it("duplicates the selection as an offset group above existing items", () => {
    const items = [
      makeItem("one", 1),
      makeItem("two", 2),
      makeItem("three", 3),
    ];
    const ids = ["copy-one", "copy-two"];

    const result = duplicateCanvasItems(items, new Set(["one", "three"]), {
      createId: () => ids.shift()!,
      now: 100,
    });

    expect(result.duplicatedItemIds).toEqual(["copy-one", "copy-two"]);
    expect(result.items.slice(-2)).toEqual([
      expect.objectContaining({ id: "copy-one", x: 42, y: 52, zIndex: 4 }),
      expect.objectContaining({ id: "copy-two", x: 62, y: 92, zIndex: 5 }),
    ]);
    expect(items).toEqual([
      makeItem("one", 1),
      makeItem("two", 2),
      makeItem("three", 3),
    ]);
  });

  it("moves a selected group by one deterministic layer", () => {
    const items = [
      makeItem("one", 10),
      makeItem("two", 20),
      makeItem("three", 30),
    ];

    const forward = moveCanvasItemsOneLayer(
      items,
      new Set(["one", "two"]),
      "forward",
      100,
    );
    expect(
      [...forward].sort((a, b) => a.zIndex - b.zIndex).map(({ id }) => id),
    ).toEqual(["three", "one", "two"]);

    const backward = moveCanvasItemsOneLayer(
      forward,
      new Set(["one", "two"]),
      "backward",
      200,
    );
    expect(
      [...backward].sort((a, b) => a.zIndex - b.zIndex).map(({ id }) => id),
    ).toEqual(["one", "two", "three"]);
  });

  it("uses stable item data to break equal z-index ties", () => {
    const later = { ...makeItem("later", 1), createdAt: 2 };
    const earlier = { ...makeItem("earlier", 1), createdAt: 1 };
    const result = moveCanvasItemsOneLayer(
      [later, earlier],
      new Set(["earlier"]),
      "forward",
      10,
    );

    expect(
      [...result].sort((a, b) => a.zIndex - b.zIndex).map(({ id }) => id),
    ).toEqual(["later", "earlier"]);
  });

  it("selects the next item, then previous item, after deletion", () => {
    const items = [
      makeItem("one", 1),
      makeItem("two", 2),
      makeItem("three", 3),
    ];

    expect(
      getSelectionFallbackAfterDeletion(items, new Set(["two"]), "two"),
    ).toBe("three");
    expect(
      getSelectionFallbackAfterDeletion(
        items,
        new Set(["two", "three"]),
        "two",
      ),
    ).toBe("one");
    expect(
      getSelectionFallbackAfterDeletion(
        items,
        new Set(items.map(({ id }) => id)),
        "two",
      ),
    ).toBeNull();
  });
});
