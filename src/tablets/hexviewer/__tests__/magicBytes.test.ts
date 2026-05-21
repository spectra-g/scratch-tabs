import { detectMagicBytes } from "../utils/magicBytes";

describe("detectMagicBytes", () => {
  const bytes = (...hex: number[]) => new Uint8Array(hex);

  it("returns null for empty input", () => {
    expect(detectMagicBytes(new Uint8Array(0))).toBeNull();
  });

  it("returns null for single byte", () => {
    expect(detectMagicBytes(bytes(0x89))).toBeNull();
  });

  it("returns null for unknown signature", () => {
    expect(detectMagicBytes(bytes(0xAA, 0xBB, 0xCC, 0xDD))).toBeNull();
  });

  it("detects PNG", () => {
    const result = detectMagicBytes(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("PNG Image");
    expect(result!.extension).toBe("png");
    expect(result!.mime).toBe("image/png");
  });

  it("detects JPEG", () => {
    const result = detectMagicBytes(bytes(0xFF, 0xD8, 0xFF, 0xE0));
    expect(result?.type).toBe("JPEG Image");
  });

  it("detects PDF", () => {
    const result = detectMagicBytes(bytes(0x25, 0x50, 0x44, 0x46, 0x2D));
    expect(result?.type).toBe("PDF Document");
    expect(result?.extension).toBe("pdf");
  });

  it("detects ZIP", () => {
    const result = detectMagicBytes(bytes(0x50, 0x4B, 0x03, 0x04, 0x14));
    expect(result?.type).toBe("ZIP Archive");
  });

  it("detects ELF", () => {
    const result = detectMagicBytes(bytes(0x7F, 0x45, 0x4C, 0x46, 0x02));
    expect(result?.type).toBe("ELF Executable/Library");
  });

  it("detects GZip", () => {
    const result = detectMagicBytes(bytes(0x1F, 0x8B, 0x08));
    expect(result?.type).toBe("GZip Archive");
  });

  it("detects SQLite", () => {
    const header = [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66];
    const result = detectMagicBytes(new Uint8Array(header));
    expect(result?.type).toBe("SQLite Database");
  });

  it("detects PE executable", () => {
    const result = detectMagicBytes(bytes(0x4D, 0x5A, 0x90, 0x00));
    expect(result?.type).toBe("PE Executable (Windows)");
    expect(result?.extension).toBe("exe");
  });

  it("detects MP4 using offset-4 signature", () => {
    // 4 padding bytes, then 'ftyp'
    const result = detectMagicBytes(bytes(0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70));
    expect(result?.type).toBe("MP4 Video");
  });

  it("returns null if buffer is shorter than signature offset", () => {
    // MP4 needs at least 8 bytes
    const result = detectMagicBytes(bytes(0x00, 0x00, 0x00));
    expect(result).toBeNull();
  });
});
