import { rgbaToHex } from "./color";

export function extractPaletteFromImageData(
  imageData: ImageData,
  maxColors = 6,
  sampleStep = 8,
): string[] {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const data = imageData.data;
  const stride = Math.max(4, sampleStep * 4);

  for (let i = 0; i < data.length; i += stride) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((bucket) =>
      rgbaToHex({
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
        a: 255,
      }),
    );
}
