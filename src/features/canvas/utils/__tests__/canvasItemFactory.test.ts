import {
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../../constants";
import { createTextCanvasItem } from "../canvasItemFactory";

describe("createTextCanvasItem", () => {
  it("creates deterministic text-card geometry when ids and time are supplied", () => {
    expect(
      createTextCanvasItem({
        id: "item-1",
        position: { x: -40, y: 75 },
        zIndex: 4,
        text: "hello",
        now: 123,
      }),
    ).toEqual({
      id: "item-1",
      type: "text",
      x: -40,
      y: 75,
      width: DEFAULT_TEXT_ITEM_WIDTH,
      height: DEFAULT_TEXT_ITEM_HEIGHT,
      zIndex: 4,
      createdAt: 123,
      updatedAt: 123,
      text: "hello",
    });
  });
});
