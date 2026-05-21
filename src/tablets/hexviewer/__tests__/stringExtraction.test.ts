import { extractStrings } from "../utils/stringExtraction";

describe("extractStrings", () => {
  it("returns empty array for empty input", () => {
    expect(extractStrings(new Uint8Array(0))).toEqual([]);
  });

  it("returns empty array when no run meets the minimum length", () => {
    // Only 3 printable chars between nulls
    const bytes = new Uint8Array([0x00, 0x41, 0x42, 0x43, 0x00]);
    expect(extractStrings(bytes, 4)).toEqual([]);
  });

  it("extracts a single string of exactly minLength", () => {
    // 'ABCD'
    const bytes = new Uint8Array([0x41, 0x42, 0x43, 0x44]);
    const result = extractStrings(bytes, 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ offset: 0, value: "ABCD", length: 4 });
  });

  it("extracts multiple strings separated by non-printable bytes", () => {
    // 'Hello' (0x00) 'World'
    const hello = [0x48, 0x65, 0x6C, 0x6C, 0x6F];
    const world = [0x57, 0x6F, 0x72, 0x6C, 0x64];
    const bytes = new Uint8Array([...hello, 0x00, ...world]);
    const result = extractStrings(bytes, 4);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ offset: 0, value: "Hello", length: 5 });
    expect(result[1]).toMatchObject({ offset: 6, value: "World", length: 5 });
  });

  it("respects configurable minLength", () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43, 0x00]); // 'ABC'
    expect(extractStrings(bytes, 3)).toHaveLength(1);
    expect(extractStrings(bytes, 4)).toHaveLength(0);
  });

  it("does not include control chars (below 0x20) in runs", () => {
    // Tab (0x09) is not printable
    const bytes = new Uint8Array([0x41, 0x42, 0x09, 0x43, 0x44, 0x45, 0x46]);
    const result = extractStrings(bytes, 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ offset: 3, value: "CDEF" });
  });

  it("excludes 0x7F (DEL) from printable runs", () => {
    const bytes = new Uint8Array([0x41, 0x42, 0x43, 0x44, 0x7F, 0x45]);
    const result = extractStrings(bytes, 4);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("ABCD");
  });

  it("handles all-null input", () => {
    expect(extractStrings(new Uint8Array(16), 4)).toEqual([]);
  });

  it("handles string that runs to end of buffer", () => {
    const bytes = new Uint8Array([0x00, 0x41, 0x42, 0x43, 0x44, 0x45]);
    const result = extractStrings(bytes, 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ offset: 1, value: "ABCDE", length: 5 });
  });
});
