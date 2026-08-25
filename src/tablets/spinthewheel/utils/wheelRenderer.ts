import { readableTextColor } from "./palette";

export const MIN_LABEL_FONT_PX = 9;
export const MAX_LABEL_FONT_PX = 20;

export const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const OUTER_PADDING_PX = 4;
const LABEL_RIGHT_MARGIN_RATIO = 0.94;
const LABEL_MAX_WIDTH_RATIO = 0.72;
const PLACEHOLDER_FILL = "#334155";
const PLACEHOLDER_TEXT = "#cbd5e1";
const SLICE_SEPARATOR = "rgba(255, 255, 255, 0.85)";

export interface WheelSlice {
  label: string;
  color: string;
}

export interface DrawWheelOptions {
  /** Square canvas size in CSS pixels. */
  size: number;
  slices: WheelSlice[];
  /** Wheel rotation in degrees (clockwise, 0 = pointer at 12 o'clock). */
  rotationDeg?: number;
}

/** Shrinks then truncates a label until it fits `maxWidth`, measured via callback. */
export function fitLabel(
  label: string,
  maxWidth: number,
  measure: (text: string, fontPx: number) => number,
): { text: string; fontSize: number } {
  let fontSize = MAX_LABEL_FONT_PX;
  while (fontSize > MIN_LABEL_FONT_PX && measure(label, fontSize) > maxWidth) {
    fontSize -= 1;
  }
  if (measure(label, fontSize) <= maxWidth) {
    return { text: label, fontSize };
  }

  let text = label;
  while (text.length > 1 && measure(`${text}…`, fontSize) > maxWidth) {
    text = text.slice(0, -1);
  }
  return { text: `${text.trimEnd()}…`, fontSize };
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, size: number): void {
  const center = size / 2;
  ctx.beginPath();
  ctx.arc(center, center, center - OUTER_PADDING_PX, 0, Math.PI * 2);
  ctx.fillStyle = PLACEHOLDER_FILL;
  ctx.fill();
  ctx.font = `500 ${MAX_LABEL_FONT_PX}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PLACEHOLDER_TEXT;
  ctx.fillText("Add entries to spin", center, center);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  color: string,
  radius: number,
  measure: (text: string, fontPx: number) => number,
): void {
  const fitted = fitLabel(label, radius * LABEL_MAX_WIDTH_RATIO, measure);
  ctx.font = `600 ${fitted.fontSize}px ${FONT_STACK}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = readableTextColor(color);
  ctx.fillText(fitted.text, radius * LABEL_RIGHT_MARGIN_RATIO, 0);
}

/**
 * Draws the wheel onto a 2D context. Pure with respect to inputs: no DOM or
 * state is touched beyond the passed context, so it can be unit tested with a
 * mock context.
 */
export function drawWheel(
  ctx: CanvasRenderingContext2D,
  options: DrawWheelOptions,
): void {
  const { size, slices } = options;
  const rotationRad = ((options.rotationDeg ?? 0) * Math.PI) / 180;
  const center = size / 2;
  const radius = center - OUTER_PADDING_PX;

  ctx.clearRect(0, 0, size, size);

  if (slices.length === 0) {
    drawPlaceholder(ctx, size);
    return;
  }

  const setFontAndMeasure =
    (ctx: CanvasRenderingContext2D) =>
    (text: string, fontPx: number): number => {
      ctx.font = `600 ${fontPx}px ${FONT_STACK}`;
      return ctx.measureText(text).width;
    };

  if (slices.length === 1) {
    const slice = slices[0];
    const measure = setFontAndMeasure(ctx);
    const fitted = fitLabel(slice.label, radius * LABEL_MAX_WIDTH_RATIO * 1.4, measure);
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.font = `600 ${fitted.fontSize}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = readableTextColor(slice.color);
    ctx.fillText(fitted.text, center, center);
    return;
  }

  const arcAngle = (Math.PI * 2) / slices.length;
  slices.forEach((slice, index) => {
    const start = -Math.PI / 2 + rotationRad + index * arcAngle;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, start + arcAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = SLICE_SEPARATOR;
    ctx.stroke();
  });

  slices.forEach((slice, index) => {
    const midAngle =
      -Math.PI / 2 + rotationRad + (index + 0.5) * arcAngle;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(midAngle);
    drawLabel(ctx, slice.label, slice.color, radius, setFontAndMeasure(ctx));
    ctx.restore();
  });
}
