import { formatBytes } from "../utils/formatBytes";

describe("formatBytes", () => {
  it("formats 0 as '0 B'", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats 1 as '1.0 B'", () => {
    expect(formatBytes(1)).toBe("1.0 B");
  });

  it("formats 1024 as '1.0 KB'", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats 1536 as '1.5 KB'", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats 1048576 as '1.0 MB'", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("formats 1073741824 as '1.0 GB'", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("formats 2048 as '2.0 KB'", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats 512 as '512.0 B'", () => {
    expect(formatBytes(512)).toBe("512.0 B");
  });

  it("formats 1.5 MB correctly", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
