import {
  DEFAULT_CODE_ITEM_HEIGHT,
  DEFAULT_CODE_ITEM_WIDTH,
  DEFAULT_TEXT_ITEM_HEIGHT,
  DEFAULT_TEXT_ITEM_WIDTH,
} from "../../constants";
import {
  createCodeCanvasItem,
  createTextCanvasItem,
  getDetectedCanvasCodeLanguage,
} from "../canvasItemFactory";

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

describe("createCodeCanvasItem", () => {
  it("detects and locks unambiguous JSON with durable presentation defaults", () => {
    expect(
      createCodeCanvasItem({
        id: "code-1",
        position: { x: 10, y: -20 },
        zIndex: 5,
        source: '{"answer":42}',
        now: 456,
      }),
    ).toEqual({
      id: "code-1",
      type: "code",
      x: 10,
      y: -20,
      width: DEFAULT_CODE_ITEM_WIDTH,
      height: DEFAULT_CODE_ITEM_HEIGHT,
      zIndex: 5,
      createdAt: 456,
      updatedAt: 456,
      source: '{"answer":42}',
      language: "json",
      languageLocked: true,
      collapsed: false,
      wrap: false,
    });
  });

  it("leaves an empty code card available for later detection", () => {
    expect(getDetectedCanvasCodeLanguage("  ")).toEqual({
      language: "plaintext",
      languageLocked: false,
    });
  });
});
