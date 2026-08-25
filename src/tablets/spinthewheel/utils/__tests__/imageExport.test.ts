import {
  canvasToPngBlob,
  copyPngToClipboard,
  downloadCanvasAsPng,
  exportWheelImage,
  sanitizeImageFilename,
} from "../imageExport";

function createMockCanvas(blob: Blob | null): HTMLCanvasElement {
  return {
    toBlob: (callback: (blob: Blob | null) => void) => callback(blob),
    width: 100,
    height: 100,
  } as unknown as HTMLCanvasElement;
}

const pngBlob = new Blob(["png"], { type: "image/png" });

describe("canvasToPngBlob", () => {
  it("resolves with the blob produced by the canvas", async () => {
    const blob = await canvasToPngBlob(createMockCanvas(pngBlob));
    expect(blob).toBe(pngBlob);
  });

  it("resolves null when the canvas yields no blob", async () => {
    const blob = await canvasToPngBlob(createMockCanvas(null));
    expect(blob).toBeNull();
  });

  it("resolves null when toBlob throws", async () => {
    const canvas = {
      toBlob: () => {
        throw new Error("boom");
      },
    } as unknown as HTMLCanvasElement;
    expect(await canvasToPngBlob(canvas)).toBeNull();
  });
});

describe("copyPngToClipboard", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.ClipboardItem;
    jest.restoreAllMocks();
  });

  function mockClipboard(write?: (items: ClipboardItem[]) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", {
      value: { write },
      configurable: true,
      writable: true,
    });
  }

  function mockClipboardItem(impl?: jest.Mock) {
    type ItemCtor = new (items: Record<string, Blob>) => unknown;
    const ctor: ItemCtor | undefined = impl
      ? class {
          constructor(public items: Record<string, Blob>) {
            impl(items);
          }
        }
      : undefined;
    (globalThis as { ClipboardItem?: ItemCtor }).ClipboardItem = ctor;
  }

  it("returns false when ClipboardItem is unsupported", async () => {
    mockClipboard(jest.fn());
    mockClipboardItem(undefined);

    expect(await copyPngToClipboard(createMockCanvas(pngBlob))).toBe(false);
  });

  it("writes an image/png clipboard item on success", async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const itemCtor = jest.fn();
    mockClipboard(write);
    mockClipboardItem(itemCtor);

    const result = await copyPngToClipboard(createMockCanvas(pngBlob));

    expect(result).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(itemCtor).toHaveBeenCalledWith({ "image/png": pngBlob });
  });

  it("returns false when the clipboard write rejects", async () => {
    mockClipboard(jest.fn().mockRejectedValue(new Error("denied")));
    mockClipboardItem(class {});

    expect(await copyPngToClipboard(createMockCanvas(pngBlob))).toBe(false);
  });
});

describe("downloadCanvasAsPng", () => {
  it("creates an object URL, clicks a download anchor, and revokes the URL", async () => {
    const objectUrl = "blob:mock";
    URL.createObjectURL = jest.fn().mockReturnValue(objectUrl);
    URL.revokeObjectURL = jest.fn();
    const anchor: HTMLAnchorElement = {
      href: "",
      download: "",
      click: jest.fn(),
      remove: jest.fn(),
    } as unknown as HTMLAnchorElement;
    const appendChild = jest.spyOn(document.body, "appendChild").mockImplementation(() => anchor as unknown as Node);
    jest.spyOn(document, "createElement").mockImplementation(() => anchor as unknown as HTMLElement);

    const result = await downloadCanvasAsPng(createMockCanvas(pngBlob), "my-wheel.png");

    expect(result).toBe(true);
    expect(anchor.download).toBe("my-wheel.png");
    expect(anchor.href).toBe(objectUrl);
    expect(anchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);

    appendChild.mockRestore();
    jest.restoreAllMocks();
  });

  it("returns false when there is no blob", async () => {
    URL.createObjectURL = jest.fn();
    expect(await downloadCanvasAsPng(createMockCanvas(null), "x.png")).toBe(false);
  });
});

describe("exportWheelImage", () => {
  function installAnchorMock() {
    const objectUrl = "blob:mock";
    URL.createObjectURL = jest.fn().mockReturnValue(objectUrl);
    URL.revokeObjectURL = jest.fn();
    const anchor: HTMLAnchorElement = { href: "", download: "", click: jest.fn(), remove: jest.fn() } as unknown as HTMLAnchorElement;
    const appendChild = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => anchor as unknown as Node);
    jest.spyOn(document, "createElement").mockImplementation(() => anchor as unknown as HTMLElement);
    return () => {
      appendChild.mockRestore();
      jest.restoreAllMocks();
    };
  }

  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.ClipboardItem;
    jest.restoreAllMocks();
  });

  it("prefers the clipboard when supported", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { write: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = class {};

    const result = await exportWheelImage(createMockCanvas(pngBlob), "w.png");

    expect(result).toBe("copied");
  });

  it("falls back to download when the clipboard is unsupported", async () => {
    const restore = installAnchorMock();

    const result = await exportWheelImage(createMockCanvas(pngBlob), "w.png");

    expect(result).toBe("downloaded");
    restore();
  });

  it("reports failure when neither path can produce a blob", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = await exportWheelImage(createMockCanvas(null), "w.png");

    expect(result).toBe("failed");
  });
});

describe("sanitizeImageFilename", () => {
  it("keeps word characters and dashes", () => {
    expect(sanitizeImageFilename("Team Lunch / Friday!")).toBe("Team-Lunch-Friday.png");
  });

  it("falls back to wheel.png for empty input", () => {
    expect(sanitizeImageFilename("   ")).toBe("wheel.png");
  });

  it("appends .png and caps length", () => {
    const name = sanitizeImageFilename("a".repeat(100));
    expect(name.endsWith(".png")).toBe(true);
    expect(name.length).toBeLessThanOrEqual(64);
  });
});
