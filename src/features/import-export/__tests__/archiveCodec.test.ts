import JSZip from "jszip";
import { createWorkspaceArchive, readWorkspaceArchive } from "../archiveCodec";
import type { ExportFileContent } from "../types";
import {
  createZipArchive,
  generateSha256,
  stableStringifyDataBlock,
} from "../utils";
import {
  canvasAsset,
  canvasDocument,
  exportData,
} from "../testFixtures.fixture";

const asArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });

describe("workspace archive codec", () => {
  it("writes a v2 manifest with checksums and round-trips Canvas records", async () => {
    const archive = await createWorkspaceArchive(
      exportData,
      [canvasDocument],
      [canvasAsset],
      "2026-07-23T10:00:00.000Z",
    );
    const zip = await JSZip.loadAsync(await asArrayBuffer(archive));
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    );

    expect(manifest).toEqual(
      expect.objectContaining({
        exportFormatVersion: "2.0.0",
        entries: expect.arrayContaining([
          expect.objectContaining({
            path: "data/workspaces.json",
            kind: "workspace-data",
            sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
          expect.objectContaining({
            kind: "canvas-document",
            id: canvasDocument.id,
          }),
          expect.objectContaining({
            kind: "canvas-asset",
            id: canvasAsset.id,
            mimeType: "image/png",
            byteLength: canvasAsset.byteLength,
          }),
        ]),
      }),
    );

    const decoded = await readWorkspaceArchive(
      new Blob([await asArrayBuffer(archive)]),
    );
    expect(decoded.data.tabs).toHaveLength(2);
    expect(decoded.canvasDocuments).toEqual([canvasDocument]);
    expect(decoded.canvasAssets[0]).toEqual(
      expect.objectContaining({
        id: canvasAsset.id,
        workspaceId: canvasAsset.workspaceId,
        byteLength: canvasAsset.byteLength,
        blob: expect.objectContaining({
          size: canvasAsset.byteLength,
          type: "image/png",
        }),
      }),
    );
  });

  it("reports a corrupt Canvas asset as a partial error", async () => {
    const archive = await createWorkspaceArchive(
      exportData,
      [canvasDocument],
      [canvasAsset],
    );
    const zip = await JSZip.loadAsync(await asArrayBuffer(archive));
    zip.file("canvas/assets/000000.bin", "wrong");
    const tampered = await zip.generateAsync({ type: "uint8array" });

    const decoded = await readWorkspaceArchive(new Blob([tampered]));

    expect(decoded.data.tabs).toHaveLength(2);
    expect(decoded.canvasDocuments).toHaveLength(1);
    expect(decoded.canvasAssets).toEqual([]);
    expect(decoded.canvasErrors).toEqual([
      expect.stringContaining("Canvas asset asset-1 was skipped"),
    ]);
  });

  it("treats invalid Canvas asset metadata as a partial import error", async () => {
    const archive = await createWorkspaceArchive(
      exportData,
      [canvasDocument],
      [canvasAsset],
    );
    const zip = await JSZip.loadAsync(await asArrayBuffer(archive));
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    );
    const assetEntry = manifest.entries.find(
      (entry: { kind: string }) => entry.kind === "canvas-asset",
    );
    assetEntry.mimeType = "text/html";
    zip.file("manifest.json", JSON.stringify(manifest));
    const tampered = await zip.generateAsync({ type: "uint8array" });

    const decoded = await readWorkspaceArchive(new Blob([tampered]));

    expect(decoded.data.tabs).toHaveLength(2);
    expect(decoded.canvasAssets).toEqual([]);
    expect(decoded.canvasErrors).toEqual([
      expect.stringContaining("invalid asset metadata"),
    ]);
  });

  it("imports legacy non-Canvas v1.1 archives", async () => {
    const legacyData = {
      ...exportData,
      tabs: exportData.tabs.filter((tab) => tab.contentKind !== "canvas"),
      splitViews: [],
    };
    const content: ExportFileContent = {
      exportFormatVersion: "1.1.0",
      exportedAt: "2025-01-01T00:00:00.000Z",
      data: legacyData,
    };
    const checksum = await generateSha256(stableStringifyDataBlock(legacyData));
    const archive = await createZipArchive(
      JSON.stringify(content, null, 2),
      checksum,
    );

    const decoded = await readWorkspaceArchive(
      new Blob([await asArrayBuffer(archive)]),
    );

    expect(decoded.exportFormatVersion).toBe("1.1.0");
    expect(decoded.data.tabs).toEqual(legacyData.tabs);
    expect(decoded.canvasDocuments).toEqual([]);
    expect(decoded.canvasAssets).toEqual([]);
  });
});
