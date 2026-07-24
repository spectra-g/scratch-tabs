import {
  getCanvasKeyboardCommand,
  getCanvasNudgeDelta,
  hasCanvasPrimaryModifier,
  isCanvasEditableEvent,
  isCanvasInteractiveControlEvent,
} from "../canvasKeyboard";

const keyEvent = (
  key: string,
  overrides: Partial<{
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }> = {},
) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

describe("Canvas keyboard command mapping", () => {
  it("uses Command on Apple platforms and Control elsewhere", () => {
    expect(
      hasCanvasPrimaryModifier({ metaKey: true, ctrlKey: false }, "mac"),
    ).toBe(true);
    expect(
      hasCanvasPrimaryModifier({ metaKey: false, ctrlKey: true }, "mac"),
    ).toBe(false);
    expect(
      hasCanvasPrimaryModifier({ metaKey: false, ctrlKey: true }, "other"),
    ).toBe(true);
    expect(
      hasCanvasPrimaryModifier({ metaKey: true, ctrlKey: false }, "other"),
    ).toBe(false);
  });

  it("maps primary-modifier commands for both platform families", () => {
    expect(
      getCanvasKeyboardCommand(keyEvent("d", { metaKey: true }), "mac"),
    ).toEqual({ type: "duplicate" });
    expect(
      getCanvasKeyboardCommand(keyEvent("a", { ctrlKey: true }), "other"),
    ).toEqual({ type: "select-all" });
    expect(
      getCanvasKeyboardCommand(
        keyEvent("z", { metaKey: true, shiftKey: true }),
        "mac",
      ),
    ).toEqual({ type: "redo" });
  });

  it("maps one-unit and ten-unit nudge distances", () => {
    expect(
      getCanvasKeyboardCommand(
        keyEvent("ArrowRight", { altKey: true }),
        "other",
      ),
    ).toEqual({ type: "nudge", direction: "right", distance: 10 });
    expect(
      getCanvasKeyboardCommand(
        keyEvent("ArrowUp", { altKey: true, shiftKey: true }),
        "other",
      ),
    ).toEqual({ type: "nudge", direction: "up", distance: 100 });
    expect(getCanvasNudgeDelta("left", 100)).toEqual({ x: -100, y: 0 });
  });

  it("leaves clipboard shortcuts to Canvas ClipboardEvent handlers", () => {
    for (const key of ["c", "x", "v"]) {
      expect(
        getCanvasKeyboardCommand(keyEvent(key, { ctrlKey: true }), "other"),
      ).toBeNull();
    }
  });

  it("finds semantic editable targets anywhere in a composed path", () => {
    const wrapper = document.createElement("div");
    const textbox = document.createElement("div");
    textbox.setAttribute("role", "textbox");

    expect(
      isCanvasEditableEvent({ composedPath: () => [wrapper, textbox, window] }),
    ).toBe(true);
    expect(
      isCanvasEditableEvent({ composedPath: () => [wrapper, window] }),
    ).toBe(false);
  });

  it("keeps toolbar buttons under normal browser keyboard control", () => {
    const button = document.createElement("button");
    const wrapper = document.createElement("div");
    expect(
      isCanvasInteractiveControlEvent({
        composedPath: () => [button, wrapper, window],
      }),
    ).toBe(true);
    expect(
      isCanvasInteractiveControlEvent({
        composedPath: () => [wrapper, window],
      }),
    ).toBe(false);
  });
});
