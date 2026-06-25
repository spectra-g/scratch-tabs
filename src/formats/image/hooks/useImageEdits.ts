import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { buildHistogram, ImageHistogram } from "../utils/histogram";
import { extractPaletteFromImageData } from "../utils/palette";
import {
  emptyImageEditState,
  getEditedDimensions,
  ImageEdit,
  imageEditReducer,
} from "../utils/imageEdits";

export interface RenderedImageResult {
  canvas: HTMLCanvasElement | null;
  dataUri: string | null;
  estimatedBytes: number;
  palette: string[];
  histogram: ImageHistogram | null;
}

function applyContextFilters(context: CanvasRenderingContext2D, edits: ImageEdit[]) {
  const filters: string[] = [];
  for (const edit of edits) {
    if (edit.type === "adjust") {
      if (edit.brightness !== undefined) filters.push(`brightness(${100 + edit.brightness}%)`);
      if (edit.contrast !== undefined) filters.push(`contrast(${100 + edit.contrast}%)`);
      if (edit.saturation !== undefined) filters.push(`saturate(${100 + edit.saturation}%)`);
    }
    if (edit.type === "filter") {
      if (edit.name === "grayscale") filters.push("grayscale(100%)");
      if (edit.name === "invert") filters.push("invert(100%)");
      if (edit.name === "sepia") filters.push("sepia(100%)");
    }
  }
  context.filter = filters.join(" ") || "none";
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function drawSourceToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): HTMLCanvasElement {
  const canvas = createCanvas(sourceWidth, sourceHeight);
  const context = canvas.getContext("2d");
  context?.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  return canvas;
}

function renderRotate(source: HTMLCanvasElement, degrees: 90 | 180 | 270): HTMLCanvasElement {
  const quarterTurn = degrees === 90 || degrees === 270;
  const canvas = createCanvas(
    quarterTurn ? source.height : source.width,
    quarterTurn ? source.width : source.height,
  );
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function renderFlip(source: HTMLCanvasElement, axis: "horizontal" | "vertical"): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.translate(axis === "horizontal" ? canvas.width : 0, axis === "vertical" ? canvas.height : 0);
  context.scale(axis === "horizontal" ? -1 : 1, axis === "vertical" ? -1 : 1);
  context.drawImage(source, 0, 0);
  return canvas;
}

function renderCrop(source: HTMLCanvasElement, edit: Extract<ImageEdit, { type: "crop" }>): HTMLCanvasElement {
  const x = Math.max(0, Math.min(source.width - 1, Math.round(edit.x)));
  const y = Math.max(0, Math.min(source.height - 1, Math.round(edit.y)));
  const width = Math.max(1, Math.min(source.width - x, Math.round(edit.width)));
  const height = Math.max(1, Math.min(source.height - y, Math.round(edit.height)));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context?.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas;
}

function renderResize(source: HTMLCanvasElement, edit: Extract<ImageEdit, { type: "resize" }>): HTMLCanvasElement {
  const canvas = createCanvas(edit.width, edit.height);
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function renderFiltered(source: HTMLCanvasElement, edit: Extract<ImageEdit, { type: "adjust" | "filter" }>): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  applyContextFilters(context, [edit]);
  context.drawImage(source, 0, 0);
  return canvas;
}

export function renderImageToCanvas(
  image: HTMLImageElement,
  edits: ImageEdit[],
): HTMLCanvasElement {
  return edits.reduce<HTMLCanvasElement>((current, edit) => {
    switch (edit.type) {
      case "rotate":
        return renderRotate(current, edit.degrees);
      case "flip":
        return renderFlip(current, edit.axis);
      case "crop":
        return renderCrop(current, edit);
      case "resize":
        return renderResize(current, edit);
      case "adjust":
      case "filter":
        return renderFiltered(current, edit);
      default:
        return current;
    }
  }, drawSourceToCanvas(image, image.naturalWidth, image.naturalHeight));
}

export function useImageEdits(image: HTMLImageElement | null) {
  const [state, dispatch] = useReducer(imageEditReducer, emptyImageEditState);
  const [rendered, setRendered] = useState<RenderedImageResult>({
    canvas: null,
    dataUri: null,
    estimatedBytes: 0,
    palette: [],
    histogram: null,
  });
  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!image) {
      setRendered({ canvas: null, dataUri: null, estimatedBytes: 0, palette: [], histogram: null });
      return;
    }

    const canvas = renderImageToCanvas(image, state.past);
    lastCanvasRef.current = canvas;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = context?.getImageData(0, 0, canvas.width, canvas.height) ?? null;
    const dataUri = canvas.toDataURL("image/png");
    setRendered({
      canvas,
      dataUri,
      estimatedBytes: Math.round((dataUri.length * 3) / 4),
      palette: imageData ? extractPaletteFromImageData(imageData) : [],
      histogram: imageData ? buildHistogram(imageData) : null,
    });
  }, [image, state.past]);

  const exportDataUri = useCallback((mimeType: string, quality?: number) => {
    const canvas = lastCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL(mimeType, quality);
  }, []);

  const dimensions = useMemo(() => {
    if (!image) return { width: 0, height: 0 };
    return getEditedDimensions({ width: image.naturalWidth, height: image.naturalHeight }, state.past);
  }, [image, state.past]);

  return {
    edits: state.past,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    isModified: state.past.length > 0,
    dispatch,
    rendered,
    dimensions,
    exportDataUri,
  };
}
