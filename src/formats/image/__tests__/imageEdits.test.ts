import {
  constrainResize,
  getEditedDimensions,
  imageEditReducer,
  emptyImageEditState,
} from "../utils/imageEdits";
import { renderImageToCanvas } from "../hooks/useImageEdits";

describe("image edit reducer", () => {
  it("applies undo, redo, and reset", () => {
    const first = imageEditReducer(emptyImageEditState, {
      type: "apply",
      edit: { type: "rotate", degrees: 90 },
    });
    const second = imageEditReducer(first, {
      type: "apply",
      edit: { type: "flip", axis: "horizontal" },
    });
    const undone = imageEditReducer(second, { type: "undo" });
    const redone = imageEditReducer(undone, { type: "redo" });

    expect(second.past).toHaveLength(2);
    expect(undone.past).toHaveLength(1);
    expect(undone.future).toHaveLength(1);
    expect(redone.past).toHaveLength(2);
    expect(imageEditReducer(redone, { type: "reset" })).toEqual(emptyImageEditState);
  });
});

describe("image edit dimensions", () => {
  it("rotates dimensions for quarter turns", () => {
    expect(getEditedDimensions({ width: 640, height: 480 }, [
      { type: "rotate", degrees: 90 },
    ])).toEqual({ width: 480, height: 640 });
  });

  it("keeps dimensions for 180 degree rotation", () => {
    expect(getEditedDimensions({ width: 640, height: 480 }, [
      { type: "rotate", degrees: 180 },
    ])).toEqual({ width: 640, height: 480 });
  });

  it("uses crop and resize dimensions", () => {
    expect(getEditedDimensions({ width: 640, height: 480 }, [
      { type: "crop", x: 10, y: 20, width: 100, height: 80 },
      { type: "resize", width: 50, height: 40, algorithm: "browser" },
    ])).toEqual({ width: 50, height: 40 });
  });

  it("preserves aspect ratio when requested", () => {
    expect(constrainResize({ width: 400, height: 200 }, 100, 10, true)).toEqual({
      width: 100,
      height: 50,
    });
  });
});

describe("renderImageToCanvas", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      drawImage: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      filter: "none",
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      getImageData: jest.fn(),
    })) as any;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("applies crop before rotate when edits are ordered that way", () => {
    const image = { naturalWidth: 100, naturalHeight: 50 } as HTMLImageElement;
    const canvas = renderImageToCanvas(image, [
      { type: "crop", x: 0, y: 0, width: 30, height: 10 },
      { type: "rotate", degrees: 90 },
    ]);

    expect(canvas.width).toBe(10);
    expect(canvas.height).toBe(30);
  });

  it("applies crop in rotated image space after rotation", () => {
    const image = { naturalWidth: 100, naturalHeight: 50 } as HTMLImageElement;
    const canvas = renderImageToCanvas(image, [
      { type: "rotate", degrees: 90 },
      { type: "crop", x: 0, y: 0, width: 30, height: 10 },
    ]);

    expect(canvas.width).toBe(30);
    expect(canvas.height).toBe(10);
  });

  it("applies multiple crops sequentially", () => {
    const image = { naturalWidth: 100, naturalHeight: 50 } as HTMLImageElement;
    const canvas = renderImageToCanvas(image, [
      { type: "crop", x: 10, y: 10, width: 60, height: 30 },
      { type: "crop", x: 5, y: 5, width: 20, height: 10 },
    ]);

    expect(canvas.width).toBe(20);
    expect(canvas.height).toBe(10);
  });
});
