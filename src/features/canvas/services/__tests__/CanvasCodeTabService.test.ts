import type { CanvasCodeItem } from "../../types";
import { createTabInputFromCanvasCode } from "../CanvasCodeTabService";

const codeItem: CanvasCodeItem = {
  id: "code-1",
  type: "code",
  x: 0,
  y: 0,
  width: 480,
  height: 320,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  source: '{\n  "answer": 42\n}',
  language: "json",
  languageLocked: true,
  collapsed: true,
  wrap: true,
};

describe("CanvasCodeTabService", () => {
  it("creates an independent normal text-tab input from a code card", () => {
    const input = createTabInputFromCanvasCode(codeItem);

    expect(input).toEqual({
      title: "JSON from Canvas",
      content: codeItem.source,
      language: "json",
      languageLocked: true,
      contentKind: "text",
    });
    expect(input).not.toHaveProperty("documentId");
  });
});
