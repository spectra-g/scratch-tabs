import { getExportOption, makeImageFileName } from "../utils/canvasExport";

describe("image export helpers", () => {
  it("chooses MIME type and extension for export formats", () => {
    expect(getExportOption("png")).toMatchObject({
      mimeType: "image/png",
      extension: "png",
      supportsQuality: false,
    });
    expect(getExportOption("jpeg")).toMatchObject({
      mimeType: "image/jpeg",
      extension: "jpg",
      supportsQuality: true,
    });
  });

  it("sanitizes exported file names", () => {
    expect(makeImageFileName("archive.zip: assets/logo.png", "webp")).toBe(
      "archive.zip- assets-logo.webp",
    );
  });
});
