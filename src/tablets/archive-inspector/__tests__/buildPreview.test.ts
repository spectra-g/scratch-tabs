import { buildPreviewFromBytes } from "../utils/buildPreview";
import { ArchiveEntry } from "../types";

function makeEntry(overrides: Partial<ArchiveEntry> = {}): ArchiveEntry {
  return {
    path: "file.txt",
    name: "file.txt",
    isDirectory: false,
    sizeUncompressed: 100,
    sizeCompressed: 80,
    compressionRatio: 0.8,
    modified: null,
    comment: "",
    encryptionType: "none",
    crc32: "00000000",
    mimeType: "text/plain",
    isTextPreviewable: true,
    isImagePreviewable: false,
    depth: 0,
    ...overrides,
  };
}

describe("buildPreviewFromBytes — text files", () => {
  it("returns a text preview for a valid UTF-8 .txt file", () => {
    const bytes = new TextEncoder().encode("hello world");
    const result = buildPreviewFromBytes("file.txt", bytes, false, makeEntry(), 0);
    expect(result.type).toBe("text");
    expect(result.content).toBe("hello world");
    expect(result.truncated).toBe(false);
  });

  it("returns text with replacement chars instead of binary-hex for truncated multi-byte UTF-8", () => {
    // 0xC3 alone is an incomplete 2-byte sequence for é (0xC3 0xA9)
    const truncatedUtf8 = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xc3]);
    const result = buildPreviewFromBytes("file.txt", truncatedUtf8, true, makeEntry(), 0);
    // Must NOT fall back to binary-hex
    expect(result.type).toBe("text");
    // Content starts with "Hello" and ends with the Unicode replacement character
    expect(result.content).toContain("Hello");
    expect(result.content).toContain("�");
  });

  it("returns json type for .json extension", () => {
    const bytes = new TextEncoder().encode('{"a":1}');
    const result = buildPreviewFromBytes("data.json", bytes, false, makeEntry({ name: "data.json", path: "data.json", isTextPreviewable: false }), 0);
    expect(result.type).toBe("json");
  });

  it("returns xml type for .xml extension", () => {
    const bytes = new TextEncoder().encode("<root><a/></root>");
    const result = buildPreviewFromBytes("data.xml", bytes, false, makeEntry({ name: "data.xml", path: "data.xml", isTextPreviewable: false }), 0);
    expect(result.type).toBe("xml");
  });
});

describe("buildPreviewFromBytes — binary files", () => {
  it("returns binary-hex for a non-text, non-image entry", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xfe]);
    const result = buildPreviewFromBytes(
      "archive.bin",
      bytes,
      false,
      makeEntry({ name: "archive.bin", path: "archive.bin", isTextPreviewable: false, isImagePreviewable: false, mimeType: "application/octet-stream" }),
      0,
    );
    expect(result.type).toBe("binary-hex");
    expect(result.content).toContain("50 4B 03 04");
  });

  it("includes absolute offset when hexPage > 0", () => {
    const bytes = new Uint8Array(16).fill(0xaa);
    const HEX_PAGE_SIZE = 64 * 1024;
    const result = buildPreviewFromBytes(
      "file.bin",
      bytes,
      true,
      makeEntry({ name: "file.bin", path: "file.bin", isTextPreviewable: false, isImagePreviewable: false, mimeType: "application/octet-stream" }),
      2,
    );
    const expectedOffset = (2 * HEX_PAGE_SIZE).toString(16).toUpperCase().padStart(8, "0");
    expect(result.content).toContain(expectedOffset);
  });
});

describe("buildPreviewFromBytes — image files", () => {
  it("returns an image data URI for image entries", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
    const result = buildPreviewFromBytes(
      "photo.jpg",
      bytes,
      false,
      makeEntry({ name: "photo.jpg", path: "photo.jpg", isTextPreviewable: false, isImagePreviewable: true, mimeType: "image/jpeg" }),
      0,
    );
    expect(result.type).toBe("image");
    expect(result.content).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.truncated).toBe(false);
  });
});
