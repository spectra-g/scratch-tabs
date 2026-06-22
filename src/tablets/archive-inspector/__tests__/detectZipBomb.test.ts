import { isZipBomb } from "../utils/detectZipBomb";

describe("isZipBomb", () => {
  it("flags ratio > 100 on large input", () => {
    expect(isZipBomb(1_000_000, 200_000_000)).toBe(true);
  });

  it("does not flag small archives regardless of ratio", () => {
    expect(isZipBomb(100, 10_000)).toBe(false);
  });

  it("does not flag exact 100:1 ratio on 500 KB compressed", () => {
    expect(isZipBomb(500_000, 50_000_000)).toBe(false);
  });

  it("does not flag small compressed archives even with extreme ratio", () => {
    expect(isZipBomb(999_999, 1_000_000_000)).toBe(false);
  });

  it("flags compressed size > 1 MB with ratio > 100", () => {
    expect(isZipBomb(2_000_000, 300_000_000)).toBe(true);
  });

  it("does not flag when uncompressed is 0", () => {
    expect(isZipBomb(2_000_000, 0)).toBe(false);
  });

  it("does not flag ratio of exactly 101:1 on 999 KB compressed", () => {
    expect(isZipBomb(999_000, 100_899_000)).toBe(false);
  });
});
