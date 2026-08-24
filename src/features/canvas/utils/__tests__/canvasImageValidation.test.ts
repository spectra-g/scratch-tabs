import { CANVAS_IMAGE_MAX_BYTES } from "../../constants";
import {
  CanvasImageValidationError,
  createCanvasStorageFullError,
  isQuotaExceededError,
  prepareCanvasImageAsset,
  sanitizeCanvasSvg,
} from "../canvasImageValidation";

const pngFile = (size = 3) =>
  new File([new Uint8Array(size)], "diagram.png", { type: "image/png" });

describe("Canvas image validation", () => {
  it("prepares a validated asset without converting its bytes to base64", async () => {
    const file = pngFile();
    const asset = await prepareCanvasImageAsset(file, "workspace-1", {
      createId: () => "asset-1",
      now: () => 123,
      decodeDimensions: async () => ({ width: 800, height: 600 }),
    });

    expect(asset.blob).toBe(file);
    expect({ ...asset, blob: undefined }).toMatchObject({
      id: "asset-1",
      workspaceId: "workspace-1",
      blob: undefined,
      mimeType: "image/png",
      originalName: "diagram.png",
      byteLength: 3,
      width: 800,
      height: 600,
      createdAt: 123,
    });
  });

  it.each([
    [
      new File(["plain"], "notes.txt", { type: "text/plain" }),
      "unsupported-type",
    ],
    [
      new File([new Uint8Array(CANVAS_IMAGE_MAX_BYTES + 1)], "huge.png", {
        type: "image/png",
      }),
      "file-too-large",
    ],
  ])("rejects unsupported or oversized files", async (file, code) => {
    await expect(
      prepareCanvasImageAsset(file, "workspace-1", {
        decodeDimensions: async () => ({ width: 1, height: 1 }),
      }),
    ).rejects.toMatchObject<Partial<CanvasImageValidationError>>({ code });
  });

  it("rejects decoded dimensions beyond the configured pixel budget", async () => {
    await expect(
      prepareCanvasImageAsset(pngFile(), "workspace-1", {
        decodeDimensions: async () => ({ width: 10_000, height: 10_000 }),
      }),
    ).rejects.toMatchObject({ code: "dimensions-too-large" });
  });

  it("does not consult storage estimates, even when the browser reports a full disk", async () => {
    const estimateStorage = jest.fn().mockResolvedValue({
      usage: Number.MAX_SAFE_INTEGER,
      quota: 1,
    });
    const asset = await prepareCanvasImageAsset(pngFile(), "workspace-1", {
      createId: () => "asset-1",
      decodeDimensions: async () => ({ width: 1, height: 1 }),
    });
    expect(asset.byteLength).toBeGreaterThan(0);
    expect(estimateStorage).not.toHaveBeenCalled();
  });

  it.each([
    [Object.assign(new Error("quota reached"), { name: "QuotaExceededError" })],
    [new DOMException("denied", "QuotaExceededError")],
    [Object.assign(new Error("boom"), { name: "NS_ERROR_DOM_QUOTA_REACHED" })],
  ])("detects real quota errors: %s", (error) => {
    expect(isQuotaExceededError(error)).toBe(true);
    expect(createCanvasStorageFullError().code).toBe("storage-full");
  });

  it.each([[new Error("plain failure")], ["nope"], [null]])(
    "ignores non-quota errors: %s",
    (error) => {
      expect(isQuotaExceededError(error)).toBe(false);
    },
  );

  it("removes executable and remote SVG content while retaining safe geometry", () => {
    const sanitized = sanitizeCanvasSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><iframe src="https://example.com" /></foreignObject>
        <defs><linearGradient id="safe"><stop offset="0" stop-color="#fff" /></linearGradient></defs>
        <rect width="10" height="10" fill="url(#safe)" onclick="alert(2)" />
        <use href="https://example.com/remote.svg#shape" />
      </svg>
    `);

    expect(sanitized).toContain("<rect");
    expect(sanitized).toContain("url(#safe)");
    expect(sanitized).not.toMatch(
      /script|foreignObject|iframe|onload|onclick|https:/i,
    );
  });

  it("rejects SVG document type declarations", () => {
    expect(() =>
      sanitizeCanvasSvg(
        '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" />',
      ),
    ).toThrow("document type declarations");
  });
});
