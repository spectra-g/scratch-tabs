import { FONT_STACK } from "./wheelRenderer";

export const CARD_PADDING_PX = 48;
export const TITLE_FONT_PX = 30;
export const MIN_TITLE_FONT_PX = 16;
export const BAND_GAP_PX = 20;

/** Winner overlay: font size scales with the wheel, capped to fit long names. */
export const WINNER_OVERLAY_FONT_RATIO = 0.13;
export const WINNER_OVERLAY_MAX_WIDTH_RATIO = 0.7;
export const WINNER_CAPTION_RATIO = 0.42;

const CARD_BACKGROUND = "#ffffff";
const CARD_TITLE_COLOR = "#0f172a";
const WINNER_OVERLAY_COLOR = "#ffffff";
const WINNER_OVERLAY_SHADOW = "rgba(0, 0, 0, 0.45)";
const WINNER_CAPTION_TEXT = "Winner";

export interface WheelCardOptions {
  title?: string;
  winnerLabel?: string | null;
}

export interface WheelCardLayout {
  width: number;
  height: number;
  /** Vertical centre of the title band, if present. */
  titleCenterY: number | null;
  wheelX: number;
  wheelY: number;
  wheelSize: number;
}

function hasText(value?: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Pure geometry for the exported card so it stays unit-testable without a canvas. */
export function computeCardLayout(
  wheelSize: number,
  options: WheelCardOptions = {},
): WheelCardLayout {
  const width = wheelSize + CARD_PADDING_PX * 2;
  const showTitle = hasText(options.title);

  let y = CARD_PADDING_PX;
  const titleCenterY = showTitle ? y + TITLE_FONT_PX / 2 : null;
  if (showTitle) {
    y += TITLE_FONT_PX + BAND_GAP_PX;
  }

  return {
    width,
    height: y + wheelSize + CARD_PADDING_PX,
    titleCenterY,
    wheelX: CARD_PADDING_PX,
    wheelY: y,
    wheelSize,
  };
}

/** Shrinks a single-line text from `basePx` until it fits `maxWidth`. */
export function fitText(
  text: string,
  maxWidth: number,
  measure: (text: string, fontPx: number) => number,
  basePx: number = TITLE_FONT_PX,
): { text: string; fontSize: number } {
  let fontSize = basePx;
  while (fontSize > MIN_TITLE_FONT_PX && measure(text, fontSize) > maxWidth) {
    fontSize -= 2;
  }
  return { text, fontSize };
}

/** Draws a two-line winner overlay centred on the wheel face:
 *  a small "Winner" caption above the name ("Charlie!"), all in white. */
export function drawWinnerOverlay(
  ctx: CanvasRenderingContext2D,
  winner: string,
  centerX: number,
  centerY: number,
  wheelSize: number,
): void {
  const text = `${winner.trim()}!`;
  const maxWidth = wheelSize * WINNER_OVERLAY_MAX_WIDTH_RATIO;
  const measure = (t: string, fontPx: number) => {
    ctx.font = `800 ${fontPx}px ${FONT_STACK}`;
    return ctx.measureText(t).width;
  };
  const nameFontPx = fitText(
    text,
    maxWidth,
    measure,
    Math.max(MIN_TITLE_FONT_PX + 2, wheelSize * WINNER_OVERLAY_FONT_RATIO),
  ).fontSize;
  const captionFontPx = Math.max(
    MIN_TITLE_FONT_PX,
    Math.round(nameFontPx * WINNER_CAPTION_RATIO),
  );

  // Centre the two-line block (caption, gap, name) on the wheel centre.
  const gap = nameFontPx * 0.15;
  const blockHeight = captionFontPx + gap + nameFontPx;
  const blockTop = centerY - blockHeight / 2;
  const captionCenterY = blockTop + captionFontPx / 2;
  const nameCenterY = blockTop + captionFontPx + gap + nameFontPx / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = WINNER_OVERLAY_SHADOW;
  ctx.shadowBlur = captionFontPx / 4;
  ctx.fillStyle = WINNER_OVERLAY_COLOR;

  ctx.font = `600 ${captionFontPx}px ${FONT_STACK}`;
  ctx.fillText(WINNER_CAPTION_TEXT, centerX, captionCenterY);

  ctx.font = `800 ${nameFontPx}px ${FONT_STACK}`;
  ctx.fillText(text, centerX, nameCenterY);
  ctx.restore();
}

/**
 * Draws title + wheel (+ winner overlaid at the wheel centre) onto `ctx`.
 * Pure with respect to inputs (no DOM access beyond the passed objects), so it
 * can be unit tested with a mock context.
 */
export function composeWheelImage(
  ctx: CanvasRenderingContext2D,
  wheel: CanvasImageSource,
  options: WheelCardOptions & { wheelSize: number },
): void {
  const { wheelSize } = options;
  const layout = computeCardLayout(wheelSize, options);

  ctx.fillStyle = CARD_BACKGROUND;
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (layout.titleCenterY !== null) {
    const maxWidth = layout.width - CARD_PADDING_PX * 2;
    const measure = (text: string, fontPx: number) => {
      ctx.font = `700 ${fontPx}px ${FONT_STACK}`;
      return ctx.measureText(text).width;
    };
    const fitted = fitText((options.title ?? "").trim(), maxWidth, measure);
    ctx.font = `700 ${fitted.fontSize}px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = CARD_TITLE_COLOR;
    ctx.fillText(fitted.text, layout.width / 2, layout.titleCenterY);
  }

  ctx.drawImage(
    wheel,
    layout.wheelX,
    layout.wheelY,
    layout.wheelSize,
    layout.wheelSize,
  );

  if (hasText(options.winnerLabel)) {
    drawWinnerOverlay(
      ctx,
      options.winnerLabel,
      layout.wheelX + layout.wheelSize / 2,
      layout.wheelY + layout.wheelSize / 2,
      layout.wheelSize,
    );
  }
}

/** Renders the live wheel onto a fresh offscreen card canvas (HiDPI-aware). */
export function renderWheelCard(
  wheel: HTMLCanvasElement,
  options: WheelCardOptions = {},
): HTMLCanvasElement | null {
  const dpr = window.devicePixelRatio || 1;
  const cssWheelSize =
    wheel.clientWidth || Math.round(wheel.width / dpr) || wheel.width;
  const layout = computeCardLayout(cssWheelSize, options);

  const card = document.createElement("canvas");
  card.width = Math.ceil(layout.width * dpr);
  card.height = Math.ceil(layout.height * dpr);

  const ctx = card.getContext("2d");
  if (!ctx) return null;

  ctx.scale(dpr, dpr);
  composeWheelImage(ctx, wheel, { ...options, wheelSize: cssWheelSize });
  return card;
}
