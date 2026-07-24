import type { CanvasItem } from "../../types";
import { getCanvasItemAccessibleLabel } from "../canvasAccessibility";

const base = {
  x: 0,
  y: 0,
  width: 300,
  height: 200,
  zIndex: 1,
  createdAt: 1,
  updatedAt: 1,
};

describe("Canvas accessible labels", () => {
  it.each<[CanvasItem, string]>([
    [
      { ...base, id: "text", type: "text", text: "  Release   notes  " },
      "Text card, Release notes",
    ],
    [
      {
        ...base,
        id: "code",
        type: "code",
        source: '{"ready":true}',
        language: "json",
        languageLocked: true,
        collapsed: false,
        wrap: false,
      },
      'JSON code card, {"ready":true}',
    ],
    [
      {
        ...base,
        id: "image",
        type: "image",
        assetId: "asset",
        altText: "",
        originalName: "architecture.png",
        objectFit: "contain",
      },
      "Image, architecture.png",
    ],
    [
      {
        ...base,
        id: "link",
        type: "link",
        canonicalUrl: "https://example.com/docs",
        hostname: "example.com",
        metadata: { title: "Canvas documentation" },
      },
      "Link card, Canvas documentation, example.com",
    ],
    [
      {
        ...base,
        id: "video",
        type: "video",
        canonicalUrl: "https://vimeo.com/76979871",
        hostname: "vimeo.com",
        provider: "vimeo",
        videoId: "76979871",
        title: "Product tour",
      },
      "Vimeo video card, Product tour",
    ],
  ])("describes card content without exposing renderer details", (item, label) => {
    expect(getCanvasItemAccessibleLabel(item)).toBe(label);
  });
});
