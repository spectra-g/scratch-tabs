import JSZip from "jszip";
import { parseArchive } from "../utils/archiveParser";

async function makeZip(files: Record<string, string>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}

describe("parseArchive", () => {
  it("returns one entry per file (non-directory)", async () => {
    const buf = await makeZip({ "a.txt": "hello", "b.json": "{}" });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    expect(entries.filter((e) => !e.isDirectory)).toHaveLength(2);
  });

  it("sets isTextPreviewable correctly", async () => {
    const buf = await makeZip({ "file.txt": "hi", "file.class": "\xCA\xFE" });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const txt = entries.find((e) => e.name === "file.txt");
    const cls = entries.find((e) => e.name === "file.class");
    expect(txt?.isTextPreviewable).toBe(true);
    expect(cls?.isTextPreviewable).toBe(false);
  });

  it("sets isImagePreviewable for image extensions", async () => {
    const buf = await makeZip({ "logo.png": "fakepng", "data.bin": "binary" });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const img = entries.find((e) => e.name === "logo.png");
    const bin = entries.find((e) => e.name === "data.bin");
    expect(img?.isImagePreviewable).toBe(true);
    expect(bin?.isImagePreviewable).toBe(false);
  });

  it("computes compressionRatio > 0.5 for highly compressible data", async () => {
    const buf = await makeZip({ "a.txt": "a".repeat(1000) });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const entry = entries.find((e) => e.name === "a.txt");
    expect(entry?.compressionRatio).toBeGreaterThan(0.5);
  });

  it("stats.extensionBreakdown groups by extension", async () => {
    const buf = await makeZip({ "a.json": "{}", "b.json": "{}", "c.txt": "x" });
    const { stats } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const jsonEntry = stats.extensionBreakdown.find((e) => e.ext === "json");
    expect(jsonEntry?.count).toBe(2);
  });

  it("captures global archive comment", async () => {
    const zip = new JSZip();
    zip.file("a.txt", "hi");
    const buf = await zip.generateAsync({ type: "arraybuffer", comment: "built by CI" });
    const { stats } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    expect(stats.archiveComment).toBe("built by CI");
  });

  it("sets fileCount and directoryCount correctly", async () => {
    const zip = new JSZip();
    zip.file("dir/file.txt", "content");
    zip.file("root.txt", "root");
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const { stats } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    expect(stats.fileCount).toBe(2);
    expect(stats.directoryCount).toBeGreaterThanOrEqual(1);
  });

  it("computes depth correctly", async () => {
    const buf = await makeZip({ "a/b/c.txt": "nested" });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const file = entries.find((e) => e.name === "c.txt");
    expect(file?.depth).toBe(2);
  });

  it("produces largestFiles sorted by size descending", async () => {
    const buf = await makeZip({
      "small.txt": "x",
      "large.txt": "x".repeat(1000),
    });
    const { stats } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    expect(stats.largestFiles[0].sizeUncompressed).toBeGreaterThanOrEqual(
      stats.largestFiles[1]?.sizeUncompressed ?? 0,
    );
  });

  it("calls onProgress with increasing values", async () => {
    const buf = await makeZip({ "a.txt": "hello" });
    const progress: number[] = [];
    await parseArchive(buf, {
      filenameEncoding: "utf-8",
      onProgress: (p) => progress.push(p),
    });
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[0]).toBeLessThanOrEqual(progress[progress.length - 1]);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("crc32 is an 8-character uppercase hex string", async () => {
    const buf = await makeZip({ "a.txt": "hello" });
    const { entries } = await parseArchive(buf, { filenameEncoding: "utf-8" });
    const file = entries.find((e) => !e.isDirectory);
    expect(file?.crc32).toMatch(/^[0-9A-F]{8}$/);
  });
});
