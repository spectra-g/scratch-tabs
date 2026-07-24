import type { CanvasCodeItem, CanvasTextItem } from "../../types";
import {
  getCanvasClipboardPlainText,
  parseCanvasClipboard,
  serializeCanvasClipboard,
} from "../canvasClipboard";

const textItem: CanvasTextItem = {
  id: "text",
  type: "text",
  x: 100,
  y: -20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
  text: "Notes",
};

const codeItem: CanvasCodeItem = {
  id: "code",
  type: "code",
  x: 500,
  y: 30,
  width: 480,
  height: 320,
  zIndex: 2,
  createdAt: 2,
  updatedAt: 2,
  source: "const answer = 42;",
  language: "javascript",
  languageLocked: true,
  collapsed: false,
  wrap: false,
};

describe("Canvas clipboard format", () => {
  it("normalizes copied geometry relative to the selection origin", () => {
    const parsed = parseCanvasClipboard(
      serializeCanvasClipboard([textItem, codeItem], "workspace-1"),
    );

    expect(parsed).toEqual(
      expect.objectContaining({
        version: 1,
        sourceWorkspaceId: "workspace-1",
      }),
    );
    expect(parsed?.items.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 50 },
    ]);
  });

  it("rejects malformed, unsupported, and duplicate item payloads", () => {
    expect(parseCanvasClipboard("{")).toBeNull();
    expect(
      parseCanvasClipboard(
        JSON.stringify({
          version: 99,
          sourceWorkspaceId: "workspace-1",
          items: [textItem],
        }),
      ),
    ).toBeNull();
    expect(
      parseCanvasClipboard(
        JSON.stringify({
          version: 1,
          sourceWorkspaceId: "workspace-1",
          items: [textItem, textItem],
        }),
      ),
    ).toBeNull();
  });

  it("always includes a safe plain-text fallback", () => {
    expect(getCanvasClipboardPlainText([textItem, codeItem])).toBe(
      "Notes\n\nconst answer = 42;",
    );
  });

  it("uses canonical URLs as the fallback for link and video cards", () => {
    expect(
      getCanvasClipboardPlainText([
        {
          ...textItem,
          id: "link-1",
          type: "link",
          canonicalUrl: "https://example.com/docs",
          hostname: "example.com",
        },
        {
          ...textItem,
          id: "video-1",
          type: "video",
          canonicalUrl: "https://vimeo.com/76979871",
          hostname: "vimeo.com",
          provider: "vimeo",
          videoId: "76979871",
        },
      ]),
    ).toBe("https://example.com/docs\n\nhttps://vimeo.com/76979871");
  });
});
