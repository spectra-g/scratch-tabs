import type { CanvasAssetRecord, CanvasDocument, CanvasItem } from "../types";

export const collectCanvasAssetIds = (
  items: readonly CanvasItem[],
): Set<string> =>
  new Set(
    items.flatMap((item) => (item.type === "image" ? [item.assetId] : [])),
  );

export const collectDocumentAssetIds = (
  documents: readonly CanvasDocument[],
): Set<string> => {
  const assetIds = new Set<string>();
  documents.forEach((document) => {
    collectCanvasAssetIds(document.items).forEach((assetId) =>
      assetIds.add(assetId),
    );
  });
  return assetIds;
};

export const remapCanvasAssetIds = (
  items: readonly CanvasItem[],
  assetIdMap: ReadonlyMap<string, string>,
  updatedAt: number,
): CanvasItem[] =>
  items.map((item) => {
    if (item.type !== "image") return { ...item };

    const assetId = assetIdMap.get(item.assetId);
    if (!assetId) {
      throw new Error(`Canvas asset ${item.assetId} was not remapped`);
    }
    return { ...item, assetId, updatedAt };
  });

export const copyCanvasAsset = (
  asset: CanvasAssetRecord,
  id: string,
  workspaceId: string,
  createdAt: number,
): CanvasAssetRecord => ({
  ...asset,
  id,
  workspaceId,
  createdAt,
});
