import type {
  CanvasAssetRecord,
  CanvasDocument,
  CanvasImageItem,
  CanvasTextItem,
} from "../../types";
import {
  collectCanvasAssetIds,
  collectDocumentAssetIds,
  copyCanvasAsset,
  remapCanvasAssetIds,
} from "../canvasAssetReferences";

const textItem: CanvasTextItem = {
  id: "text-1",
  type: "text",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  zIndex: 1,
  text: "note",
  createdAt: 1,
  updatedAt: 1,
};

const imageItem = (id: string, assetId: string): CanvasImageItem => ({
  id,
  type: "image",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  zIndex: 1,
  assetId,
  altText: "",
  objectFit: "contain",
  createdAt: 1,
  updatedAt: 1,
});

const documentWith = (
  id: string,
  items: CanvasDocument["items"],
): CanvasDocument => ({
  id,
  tabId: id,
  workspaceId: "workspace-1",
  schemaVersion: 1,
  revision: 1,
  items,
  edges: [],
  settings: { background: "dots", snapToGrid: false },
  searchText: "",
  createdAt: 1,
  updatedAt: 1,
});

describe("Canvas asset references", () => {
  it("collects unique image references without treating other cards as assets", () => {
    expect([
      ...collectCanvasAssetIds([
        textItem,
        imageItem("image-1", "asset-1"),
        imageItem("image-2", "asset-1"),
        imageItem("image-3", "asset-2"),
      ]),
    ]).toEqual(["asset-1", "asset-2"]);
  });

  it("collects references across documents for garbage collection", () => {
    expect([
      ...collectDocumentAssetIds([
        documentWith("one", [imageItem("image-1", "shared")]),
        documentWith("two", [imageItem("image-2", "survivor")]),
      ]),
    ]).toEqual(["shared", "survivor"]);
  });

  it("remaps image references while cloning every item", () => {
    const items = [textItem, imageItem("image-1", "asset-1")];
    const remapped = remapCanvasAssetIds(
      items,
      new Map([["asset-1", "asset-copy"]]),
      50,
    );

    expect(remapped).toEqual([
      textItem,
      expect.objectContaining({
        id: "image-1",
        assetId: "asset-copy",
        updatedAt: 50,
      }),
    ]);
    expect(remapped[0]).not.toBe(items[0]);
  });

  it("rejects a partial remap instead of leaving cross-workspace references", () => {
    expect(() =>
      remapCanvasAssetIds([imageItem("image-1", "missing")], new Map(), 50),
    ).toThrow("Canvas asset missing was not remapped");
  });

  it("copies immutable blob metadata under new ownership", () => {
    const asset: CanvasAssetRecord = {
      id: "asset-1",
      workspaceId: "workspace-1",
      blob: new Blob(["image"], { type: "image/png" }),
      mimeType: "image/png",
      byteLength: 5,
      createdAt: 1,
    };

    expect(copyCanvasAsset(asset, "asset-2", "workspace-2", 10)).toEqual({
      ...asset,
      id: "asset-2",
      workspaceId: "workspace-2",
      createdAt: 10,
    });
  });
});
