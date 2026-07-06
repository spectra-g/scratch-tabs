export interface ImageViewport {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface StageSize {
  width: number;
  height: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export function getFitZoom(stage: StageSize, image: ImageSize, padding = 48): number {
  if (stage.width <= 0 || stage.height <= 0 || image.width <= 0 || image.height <= 0) {
    return 1;
  }
  return Math.max(
    0.01,
    Math.min((stage.width - padding) / image.width, (stage.height - padding) / image.height),
  );
}

export function getFillZoom(stage: StageSize, image: ImageSize): number {
  if (stage.width <= 0 || stage.height <= 0 || image.width <= 0 || image.height <= 0) {
    return 1;
  }
  return Math.max(stage.width / image.width, stage.height / image.height);
}

export function clampZoom(zoom: number): number {
  return Math.min(16, Math.max(0.05, zoom));
}

export function getCenteredViewport(
  stage: StageSize,
  image: ImageSize,
  zoom: number,
): ImageViewport {
  const clampedZoom = clampZoom(zoom);
  return {
    zoom: clampedZoom,
    offsetX: (stage.width - image.width * clampedZoom) / 2,
    offsetY: (stage.height - image.height * clampedZoom) / 2,
  };
}

export function zoomAtPoint(
  viewport: ImageViewport,
  nextZoom: number,
  point: { x: number; y: number },
): ImageViewport {
  const zoom = clampZoom(nextZoom);
  const scale = zoom / viewport.zoom;
  return {
    zoom,
    offsetX: point.x - (point.x - viewport.offsetX) * scale,
    offsetY: point.y - (point.y - viewport.offsetY) * scale,
  };
}

export function getImagePointFromClient(
  rect: Pick<DOMRect, "left" | "top">,
  viewport: ImageViewport,
  image: ImageSize,
  clientX: number,
  clientY: number,
  options: { clamp: boolean },
): { x: number; y: number } | null {
  if (image.width <= 0 || image.height <= 0) return null;
  const rawX = Math.floor((clientX - rect.left - viewport.offsetX) / viewport.zoom);
  const rawY = Math.floor((clientY - rect.top - viewport.offsetY) / viewport.zoom);

  if (!options.clamp && (rawX < 0 || rawY < 0 || rawX >= image.width || rawY >= image.height)) {
    return null;
  }

  return {
    x: Math.max(0, Math.min(image.width - 1, rawX)),
    y: Math.max(0, Math.min(image.height - 1, rawY)),
  };
}
