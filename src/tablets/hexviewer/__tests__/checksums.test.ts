import { computeCRC32, computeChecksums } from "../utils/checksums";

describe("computeCRC32", () => {
  it("returns 0x00000000 for empty input", () => {
    expect(computeCRC32(new Uint8Array(0))).toBe(0x00000000);
  });

  it("computes the well-known CRC32 for '123456789'", () => {
    const bytes = new TextEncoder().encode("123456789");
    // Standard CRC32/ISO-HDLC check value
    expect(computeCRC32(bytes)).toBe(0xcbf43926);
  });

  it("returns the same value for the same input (deterministic)", () => {
    const bytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    expect(computeCRC32(bytes)).toBe(computeCRC32(bytes));
  });

  it("produces different values for different inputs", () => {
    const a = new Uint8Array([0x01]);
    const b = new Uint8Array([0x02]);
    expect(computeCRC32(a)).not.toBe(computeCRC32(b));
  });

  it("returns a 32-bit unsigned integer (not negative)", () => {
    const bytes = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
    const result = computeCRC32(bytes);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("computeChecksums", () => {
  it("returns CRC32, sha1, and sha256 for 'hello'", async () => {
    const bytes = new TextEncoder().encode("hello");
    const result = await computeChecksums(bytes);

    expect(result.crc32).toBe("3610A686");
    // Known SHA-1 of "hello"
    expect(result.sha1).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
    // Known SHA-256 of "hello"
    expect(result.sha256).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("returns a CRC32 hex string padded to 8 chars", async () => {
    const result = await computeChecksums(new Uint8Array([0x00]));
    expect(result.crc32).toHaveLength(8);
    expect(result.crc32).toMatch(/^[0-9A-F]{8}$/);
  });

  it("returns lowercase hex for sha1 and sha256", async () => {
    const result = await computeChecksums(new Uint8Array([0x41])); // 'A'
    expect(result.sha1).toMatch(/^[0-9a-f]+$/);
    expect(result.sha256).toMatch(/^[0-9a-f]+$/);
  });

  it("sha1 is 40 hex chars (160 bits)", async () => {
    const result = await computeChecksums(new TextEncoder().encode("test"));
    expect(result.sha1).toHaveLength(40);
  });

  it("sha256 is 64 hex chars (256 bits)", async () => {
    const result = await computeChecksums(new TextEncoder().encode("test"));
    expect(result.sha256).toHaveLength(64);
  });
});
