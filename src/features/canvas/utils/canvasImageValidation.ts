import {
  CANVAS_IMAGE_MAX_BYTES,
  CANVAS_IMAGE_MAX_DIMENSION,
  CANVAS_IMAGE_MAX_PIXELS,
  CANVAS_IMAGE_MIME_TYPES,
  CANVAS_IMAGE_QUOTA_RESERVE_BYTES,
} from "../constants";
import type { CanvasAssetRecord } from "../types";

const supportedMimeTypes = new Set<string>(CANVAS_IMAGE_MIME_TYPES);

export type CanvasImageValidationErrorCode =
  | "unsupported-type"
  | "file-too-large"
  | "invalid-image"
  | "dimensions-too-large"
  | "quota-exceeded"
  | "unsafe-svg";

export class CanvasImageValidationError extends Error {
  constructor(
    readonly code: CanvasImageValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CanvasImageValidationError";
  }
}

export interface CanvasImageDimensions {
  width: number;
  height: number;
}

interface ImagePreparationDependencies {
  estimateStorage?: () => Promise<StorageEstimate>;
  decodeDimensions?: (blob: Blob) => Promise<CanvasImageDimensions>;
  createId?: () => string;
  now?: () => number;
}

const SAFE_SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "pattern",
  "title",
  "desc",
]);

const SAFE_SVG_ATTRIBUTES = new Set([
  "xmlns",
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "preserveaspectratio",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "clip-path",
  "mask",
  "id",
  "href",
]);

const isSafeLocalReference = (value: string): boolean =>
  /^url\(\s*#[A-Za-z_][\w:.-]*\s*\)$/.test(value) ||
  /^#[A-Za-z_][\w:.-]*$/.test(value);

export const sanitizeCanvasSvg = (source: string): string => {
  if (/<!DOCTYPE/i.test(source)) {
    throw new CanvasImageValidationError(
      "unsafe-svg",
      "SVG files with document type declarations are not supported.",
    );
  }
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    parsed.querySelector("parsererror") ||
    parsed.documentElement.localName !== "svg"
  ) {
    throw new CanvasImageValidationError(
      "invalid-image",
      "The SVG file is invalid.",
    );
  }

  for (const element of Array.from(parsed.querySelectorAll("*"))) {
    if (!SAFE_SVG_ELEMENTS.has(element.localName.toLowerCase())) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      const value = attribute.value.trim();
      const isReferenceAttribute =
        name === "href" || name === "clip-path" || name === "mask";
      if (
        !SAFE_SVG_ATTRIBUTES.has(name) ||
        name.startsWith("on") ||
        (isReferenceAttribute && !isSafeLocalReference(value)) ||
        /(?:javascript:|data:|https?:|@import|expression\s*\()/i.test(value) ||
        (/url\s*\(/i.test(value) && !isSafeLocalReference(value))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }

  return new XMLSerializer().serializeToString(parsed.documentElement);
};

const sanitizeSvgBlob = async (blob: Blob): Promise<Blob> => {
  const sanitized = sanitizeCanvasSvg(await blob.text());
  return new Blob([sanitized], { type: "image/svg+xml" });
};

const decodeWithHtmlImage = (blob: Blob): Promise<CanvasImageDimensions> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new CanvasImageValidationError(
          "invalid-image",
          "The selected file could not be decoded as an image.",
        ),
      );
    };
    image.src = url;
  });

export const decodeCanvasImageDimensions = async (
  blob: Blob,
): Promise<CanvasImageDimensions> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Some browsers cannot decode SVG/ICO with createImageBitmap.
    }
  }
  return decodeWithHtmlImage(blob);
};

const assertSupportedFile = (file: File): string => {
  const mimeType = file.type.toLowerCase();
  if (!supportedMimeTypes.has(mimeType)) {
    throw new CanvasImageValidationError(
      "unsupported-type",
      "Choose a PNG, JPEG, GIF, WebP, BMP, ICO, or SVG image.",
    );
  }
  if (file.size > CANVAS_IMAGE_MAX_BYTES) {
    throw new CanvasImageValidationError(
      "file-too-large",
      `Images must be ${CANVAS_IMAGE_MAX_BYTES / 1024 / 1024} MB or smaller.`,
    );
  }
  return mimeType;
};

const assertDimensions = ({ width, height }: CanvasImageDimensions): void => {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new CanvasImageValidationError(
      "invalid-image",
      "The selected image has invalid dimensions.",
    );
  }
  if (
    width > CANVAS_IMAGE_MAX_DIMENSION ||
    height > CANVAS_IMAGE_MAX_DIMENSION ||
    width * height > CANVAS_IMAGE_MAX_PIXELS
  ) {
    throw new CanvasImageValidationError(
      "dimensions-too-large",
      `Images may be at most ${CANVAS_IMAGE_MAX_DIMENSION.toLocaleString()} pixels on either side and ${CANVAS_IMAGE_MAX_PIXELS.toLocaleString()} pixels in total.`,
    );
  }
};

const preflightStorageQuota = async (
  byteLength: number,
  estimateStorage?: () => Promise<StorageEstimate>,
): Promise<void> => {
  const estimate = estimateStorage
    ? await estimateStorage()
    : await navigator.storage?.estimate?.();
  if (!estimate?.quota) return;
  const usage = estimate.usage ?? 0;
  if (usage + byteLength + CANVAS_IMAGE_QUOTA_RESERVE_BYTES > estimate.quota) {
    throw new CanvasImageValidationError(
      "quota-exceeded",
      "There is not enough local storage available for this image.",
    );
  }
};

export const prepareCanvasImageAsset = async (
  file: File,
  workspaceId: string,
  dependencies: ImagePreparationDependencies = {},
): Promise<CanvasAssetRecord> => {
  const mimeType = assertSupportedFile(file);
  const blob =
    mimeType === "image/svg+xml" ? await sanitizeSvgBlob(file) : file;
  if (blob.size > CANVAS_IMAGE_MAX_BYTES) {
    throw new CanvasImageValidationError(
      "file-too-large",
      `Images must be ${CANVAS_IMAGE_MAX_BYTES / 1024 / 1024} MB or smaller.`,
    );
  }
  await preflightStorageQuota(blob.size, dependencies.estimateStorage);
  const dimensions = await (
    dependencies.decodeDimensions ?? decodeCanvasImageDimensions
  )(blob);
  assertDimensions(dimensions);

  return {
    id: dependencies.createId ? dependencies.createId() : crypto.randomUUID(),
    workspaceId,
    blob,
    mimeType,
    originalName: file.name || undefined,
    byteLength: blob.size,
    ...dimensions,
    createdAt: dependencies.now ? dependencies.now() : Date.now(),
  };
};
