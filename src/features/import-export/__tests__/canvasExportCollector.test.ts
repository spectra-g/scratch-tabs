import { CanvasExportCollector } from "../canvasExportCollector";
import {
  canvasAsset,
  canvasDocument,
  canvasTab,
  textTab,
} from "../testFixtures.fixture";

describe("CanvasExportCollector", () => {
  it("exports only Canvas records reachable from the selected tabs", async () => {
    const source = {
      getDocument: jest.fn(async (id: string) =>
        id === canvasDocument.id ? canvasDocument : undefined,
      ),
      getAsset: jest.fn(async (id: string) =>
        id === canvasAsset.id ? canvasAsset : undefined,
      ),
    };

    const result = await new CanvasExportCollector(source).collect([
      textTab,
      canvasTab,
    ]);

    expect(result.documents).toEqual([canvasDocument]);
    expect(result.assets).toEqual([canvasAsset]);
    expect(source.getDocument).toHaveBeenCalledTimes(1);
    expect(source.getAsset).toHaveBeenCalledWith(canvasAsset.id);
  });

  it("does not load orphaned documents or assets", async () => {
    const source = {
      getDocument: jest.fn(),
      getAsset: jest.fn(),
    };

    await expect(
      new CanvasExportCollector(source).collect([textTab]),
    ).resolves.toEqual({ documents: [], assets: [] });
    expect(source.getDocument).not.toHaveBeenCalled();
    expect(source.getAsset).not.toHaveBeenCalled();
  });

  it("fails rather than creating an incomplete backup", async () => {
    const source = {
      getDocument: jest.fn().mockResolvedValue(canvasDocument),
      getAsset: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      new CanvasExportCollector(source).collect([canvasTab]),
    ).rejects.toThrow("Referenced Canvas asset asset-1 could not be found");
  });
});
