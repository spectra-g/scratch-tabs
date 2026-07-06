import { buildHexContent } from "../components/HexPreview";

describe("buildHexContent", () => {
  it("renders a valid base64 page as formatted hex lines", () => {
    // 0x48 0x65 0x6C 0x6C 0x6F = "Hello"
    const base64 = btoa("Hello");
    const result = buildHexContent(base64);
    expect(result).toContain("00000000");
    expect(result).toContain("48 65 6C 6C 6F");
    expect(result).toContain("Hello");
  });

  it("produces one line per 16-byte row", () => {
    // 32 bytes → 2 rows
    const bytes = new Uint8Array(32).fill(0x41); // 'A' × 32
    const base64 = btoa(String.fromCharCode(...bytes));
    const lines = buildHexContent(base64).split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it("returns the raw input string instead of throwing when base64 is invalid", () => {
    const bad = "!!!not-valid-base64!!!";
    const result = buildHexContent(bad);
    expect(result).toBe(bad);
  });

  it("does not throw or reference an out-of-scope variable on decode failure", () => {
    expect(() => buildHexContent("@@@")).not.toThrow();
  });
});
