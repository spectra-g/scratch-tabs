import type { CanvasAssetRecord } from "../../types";
import { parseCanvasAssetRecord } from "../CanvasAssetRepository";

const asset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: "workspace-1",
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  originalName: "diagram.png",
  byteLength: 5,
  width: 100,
  height: 50,
  createdAt: 123,
};

describe("CanvasAssetRepository record parsing", () => {
  it("returns a validated Blob-backed asset record", () => {
    const parsed = parseCanvasAssetRecord(asset);

    expect(parsed).toEqual(asset);
    expect(parsed.blob).toBe(asset.blob);
  });

  it("rejects records whose byte metadata does not match the Blob", () => {
    expect(() =>
      parseCanvasAssetRecord({ ...asset, byteLength: asset.byteLength + 1 }),
    ).toThrow("Invalid Canvas asset record");
  });

  it("rejects unsupported or mismatched Blob MIME metadata", () => {
    expect(() =>
      parseCanvasAssetRecord({ ...asset, mimeType: "text/html" }),
    ).toThrow("Invalid Canvas asset record");
    expect(() =>
      parseCanvasAssetRecord({
        ...asset,
        blob: new Blob(["image"], { type: "image/jpeg" }),
      }),
    ).toThrow("Invalid Canvas asset record");
  });

  it("rejects invalid decoded dimensions", () => {
    expect(() => parseCanvasAssetRecord({ ...asset, width: 0 })).toThrow(
      "width must be a positive integer",
    );
  });
});
