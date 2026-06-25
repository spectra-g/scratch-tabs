export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function rgbaToHex({ r, g, b }: RgbaColor): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function rgbaToCss({ r, g, b, a }: RgbaColor): string {
  if (a >= 255) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

export function rgbToHsl(r: number, g: number, b: number) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const lightness = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(lightness * 100) };

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === nr) hue = (ng - nb) / delta + (ng < nb ? 6 : 0);
  if (max === ng) hue = (nb - nr) / delta + 2;
  if (max === nb) hue = (nr - ng) / delta + 4;
  hue /= 6;

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}
