import { getCanvasEditorSelection } from "../canvasEditorSelection";

describe("getCanvasEditorSelection", () => {
  it("returns the selected editor text", () => {
    const selection = { startLineNumber: 1 };
    expect(
      getCanvasEditorSelection({
        getSelection: () => selection,
        getModel: () => ({ getValueInRange: (range) => range === selection ? "https://example.com" : "" }),
      }),
    ).toBe("https://example.com");
  });

  it("returns null for empty or unavailable selections", () => {
    expect(getCanvasEditorSelection(null)).toBeNull();
    expect(
      getCanvasEditorSelection({
        getSelection: () => ({}),
        getModel: () => ({ getValueInRange: () => "" }),
      }),
    ).toBeNull();
  });
});
