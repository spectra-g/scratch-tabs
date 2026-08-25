/** Vibrant slice colours cycled for entries without a custom colour. */
export const WHEEL_PALETTE: readonly string[] = Object.freeze([
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
]);

export function colorForIndex(index: number, customColor?: string): string {
  if (customColor) return customColor;
  const count = WHEEL_PALETTE.length;
  return WHEEL_PALETTE[((index % count) + count) % count];
}

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = hex.replace(/^#/, "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Returns black or white — whichever reads better on the given background. */
export function readableTextColor(backgroundHex: string): string {
  const rgb = parseHexColor(backgroundHex);
  // Unknown/invalid colour: default to white (palette is mid-to-dark toned).
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.35 ? "#1f2937" : "#ffffff";
}
