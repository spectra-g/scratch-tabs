import type { CanvasItem } from "../../types";
import {
  buildCanvasSearchText,
  CanvasSearchIndexer,
  getCanvasSearchEntries,
  normalizeCanvasSearchField,
} from "../CanvasSearchIndexer";

const base = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
};

const items: CanvasItem[] = [
  { ...base, id: "text", type: "text", text: "  release   notes  " },
  {
    ...base,
    id: "code",
    type: "code",
    source: '{"user":"Ada"}',
    language: "json",
    languageLocked: true,
    collapsed: false,
    wrap: false,
  },
  {
    ...base,
    id: "image",
    type: "image",
    assetId: "asset-1",
    originalName: "architecture.png",
    altText: "System architecture",
    objectFit: "contain",
  },
  {
    ...base,
    id: "link",
    type: "link",
    canonicalUrl: "https://example.com/docs",
    hostname: "example.com",
    metadata: {
      title: "Canvas documentation",
      description: "Spatial notes",
      siteName: "Example Docs",
    },
  },
  {
    ...base,
    id: "video",
    type: "video",
    canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    hostname: "www.youtube.com",
    provider: "youtube",
    videoId: "dQw4w9WgXcQ",
    title: "Keyboard tour",
  },
];

describe("CanvasSearchIndexer", () => {
  it("normalizes Unicode and whitespace consistently", () => {
    expect(normalizeCanvasSearchField("  Ｃanvas\t\n search  ")).toBe(
      "Canvas search",
    );
  });

  it("builds item-addressable entries for every shipping card type", () => {
    const entries = getCanvasSearchEntries(items);

    expect(entries).toEqual([
      expect.objectContaining({
        itemId: "text",
        itemType: "text",
        text: "release notes",
      }),
      expect.objectContaining({
        itemId: "code",
        language: "json",
        text: '{"user":"Ada"}',
      }),
      expect.objectContaining({
        itemId: "image",
        text: "architecture.png\nSystem architecture",
      }),
      expect.objectContaining({
        itemId: "link",
        text: expect.stringContaining("Canvas documentation"),
      }),
      expect.objectContaining({
        itemId: "video",
        text: expect.stringContaining("Keyboard tour"),
      }),
    ]);
    expect(buildCanvasSearchText(items)).toContain("Spatial notes");
    expect(buildCanvasSearchText(items)).toContain("youtube");
  });

  it("debounces updates and flushes the latest index synchronously", () => {
    jest.useFakeTimers();
    const apply = jest.fn();
    const indexer = new CanvasSearchIndexer(100);

    indexer.schedule("tab-1", [items[0]], apply);
    indexer.schedule("tab-1", [{ ...items[0], text: "latest" }], apply);
    jest.advanceTimersByTime(99);
    expect(apply).not.toHaveBeenCalled();

    indexer.flush("tab-1");
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("latest");
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
