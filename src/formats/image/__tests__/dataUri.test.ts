import { ImageFormatModule } from "../index";
import {
  estimateDecodedBytes,
  imageMimeTypeToExtension,
  parseImageDataUri,
} from "../utils/dataUri";

describe("image data URI detection", () => {
  const module = new ImageFormatModule();

  it("detects supported base64 image data URIs", () => {
    const result = module.detect("data:image/png;base64,iVBORw0KGgo=");

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(1);
    expect(result.matchedDefinitive).toBe(true);
  });

  it("rejects non-image data URIs", () => {
    expect(module.detect("data:text/plain;base64,SGVsbG8=").match).toBe(false);
  });

  it("rejects malformed base64 payloads", () => {
    expect(module.detect("data:image/png;base64,@@@=").match).toBe(false);
  });

  it("does not claim plain SVG text", () => {
    expect(module.detect('<svg viewBox="0 0 10 10"></svg>').match).toBe(false);
  });

  it("parses MIME type and payload sizes", () => {
    const parsed = parseImageDataUri("data:image/jpeg;base64,SGVsbG8=");

    expect(parsed).toMatchObject({
      mimeType: "image/jpeg",
      mediaSubtype: "jpeg",
      decodedBytes: 5,
    });
    expect(parsed?.encodedBytes).toBeGreaterThan(5);
  });

  it("maps MIME types to expected extensions", () => {
    expect(imageMimeTypeToExtension("image/jpeg")).toBe("jpg");
    expect(imageMimeTypeToExtension("image/svg+xml")).toBe("svg");
    expect(imageMimeTypeToExtension("image/png")).toBe("png");
  });

  it("estimates decoded bytes from base64 padding", () => {
    expect(estimateDecodedBytes("SGVsbG8=")).toBe(5);
    expect(estimateDecodedBytes("TWE=")).toBe(2);
  });
});
