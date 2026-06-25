import { useMemo } from "react";
import { RgbaColor, rgbToHsl, rgbaToCss, rgbaToHex } from "../utils/color";

export interface PixelProbe {
  x: number;
  y: number;
  rgba: RgbaColor;
  hex: string;
  css: string;
  hsl: string;
}

export function buildPixelProbe(x: number, y: number, rgba: RgbaColor): PixelProbe {
  const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b);
  return {
    x,
    y,
    rgba,
    hex: rgbaToHex(rgba),
    css: rgbaToCss(rgba),
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  };
}

export function useCanvasSampler(canvas: HTMLCanvasElement | null) {
  return useMemo(() => ({
    sample(x: number, y: number): PixelProbe | null {
      if (!canvas) return null;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      const pixel = context.getImageData(x, y, 1, 1).data;
      return buildPixelProbe(x, y, {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        a: pixel[3],
      });
    },
  }), [canvas]);
}
