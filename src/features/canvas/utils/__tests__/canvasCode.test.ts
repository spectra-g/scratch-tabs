import {
  formatCanvasJson,
  getCanvasCodePreview,
  tokenizeCanvasCode,
  toggleCanvasCodeCollapsed,
} from "../canvasCode";
import type { CanvasCodeItem } from "../../types";

describe("Canvas code utilities", () => {
  it("pretty-prints complete JSON without changing its value", () => {
    const result = formatCanvasJson('{"users":[{"id":1,"active":true}]}');

    expect(result).toEqual({
      ok: true,
      source: [
        "{",
        '  "users": [',
        "    {",
        '      "id": 1,',
        '      "active": true',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
    });
  });

  it("returns a useful failure without modifying invalid JSON", () => {
    expect(formatCanvasJson("const value = 1;")).toEqual({
      ok: false,
      error: "This card does not contain valid JSON.",
    });
  });

  it("truncates by line and character limits deterministically", () => {
    expect(getCanvasCodePreview("one\ntwo\nthree", 100, 2)).toEqual({
      source: "one\ntwo",
      isTruncated: true,
    });
    expect(getCanvasCodePreview("abcdef", 4, 10)).toEqual({
      source: "abcd",
      isTruncated: true,
    });
    expect(getCanvasCodePreview("short", 10, 10)).toEqual({
      source: "short",
      isTruncated: false,
    });
  });

  it("tokenizes JSON and code while preserving every source character", () => {
    const json = '{"count":2,"enabled":true}';
    const jsonTokens = tokenizeCanvasCode(json, "json");
    expect(jsonTokens.map(({ value }) => value).join("")).toBe(json);
    expect(jsonTokens.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(["string", "number", "literal", "punctuation"]),
    );

    const javascript = "const markup = '<img onerror=alert(1)>'; // safe text";
    const codeTokens = tokenizeCanvasCode(javascript, "javascript");
    expect(codeTokens.map(({ value }) => value).join("")).toBe(javascript);
    expect(codeTokens.map(({ kind }) => kind)).toEqual(
      expect.arrayContaining(["keyword", "string", "comment"]),
    );
  });

  it("collapses code cards to a compact height and restores their prior height", () => {
    const item: CanvasCodeItem = {
      id: "code-1",
      type: "code",
      x: 0,
      y: 0,
      width: 480,
      height: 360,
      zIndex: 1,
      createdAt: 1,
      updatedAt: 1,
      source: "const value = 1;",
      language: "javascript",
      languageLocked: true,
      collapsed: false,
      wrap: false,
    };

    const collapsed = toggleCanvasCodeCollapsed(item);
    expect(collapsed).toEqual(
      expect.objectContaining({
        collapsed: true,
        height: 40,
        expandedHeight: 360,
      }),
    );
    expect(toggleCanvasCodeCollapsed(collapsed)).toEqual(item);
  });
});
