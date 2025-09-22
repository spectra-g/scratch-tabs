import { ColorInfo, ContrastResult, ImageExtractionOptions, ColorHarmonyOptions } from '../types';

// Color conversion constants
const RGB_MAX_VALUE = 255;
const HEX_BASE = 16;
const GAMMA_THRESHOLD = 0.03928;
const GAMMA_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_MULTIPLIER = 1.055;
const GAMMA_EXPONENT = 2.4;

// Luminance coefficients (ITU-R BT.709)
const LUMINANCE_RED = 0.2126;
const LUMINANCE_GREEN = 0.7152;
const LUMINANCE_BLUE = 0.0722;

// WCAG contrast levels
const WCAG_AAA_THRESHOLD = 7;
const WCAG_AA_THRESHOLD = 4.5;
const CONTRAST_BASE = 0.05;

/**
 * Converts hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');

  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], HEX_BASE),
      g: parseInt(cleanHex[1] + cleanHex[1], HEX_BASE),
      b: parseInt(cleanHex[2] + cleanHex[2], HEX_BASE),
    };
  }

  return {
    r: parseInt(cleanHex.slice(0, 2), HEX_BASE),
    g: parseInt(cleanHex.slice(2, 4), HEX_BASE),
    b: parseInt(cleanHex.slice(4, 6), HEX_BASE),
  };
}

/**
 * Converts RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(RGB_MAX_VALUE, n))).toString(HEX_BASE).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= RGB_MAX_VALUE;
  g /= RGB_MAX_VALUE;
  b /= RGB_MAX_VALUE;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  
  const l = sum / 2;
  
  if (diff === 0) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }
  
  const s = l > 0.5 ? diff / (2 - sum) : diff / sum;
  
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / diff + 2) / 6;
      break;
    case b:
      h = ((r - g) / diff + 4) / 6;
      break;
    default:
      h = 0;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const gray = Math.round(l * RGB_MAX_VALUE);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * RGB_MAX_VALUE),
    g: Math.round(hue2rgb(p, q, h) * RGB_MAX_VALUE),
    b: Math.round(hue2rgb(p, q, h - 1/3) * RGB_MAX_VALUE),
  };
}

/**
 * Calculates relative luminance for WCAG contrast
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / RGB_MAX_VALUE;
    return c <= GAMMA_THRESHOLD ? c / GAMMA_DIVISOR : Math.pow((c + GAMMA_OFFSET) / GAMMA_MULTIPLIER, GAMMA_EXPONENT);
  });

  return LUMINANCE_RED * rs + LUMINANCE_GREEN * gs + LUMINANCE_BLUE * bs;
}

/**
 * Calculates WCAG contrast ratio between two colors
 */
export function getContrastRatio(color1: ColorInfo, color2: ColorInfo): number {
  const l1 = color1.luminance;
  const l2 = color2.luminance;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + CONTRAST_BASE) / (darker + CONTRAST_BASE);
}

/**
 * Evaluates contrast ratio against WCAG standards
 */
export function evaluateContrast(ratio: number): ContrastResult['level'] {
  if (ratio >= WCAG_AAA_THRESHOLD) return 'AAA';
  if (ratio >= WCAG_AA_THRESHOLD) return 'AA';
  return 'FAIL';
}

/**
 * Generates accessibility suggestions for failing contrast ratios
 */
export function generateContrastSuggestion(
  foreground: ColorInfo,
  background: ColorInfo,
  currentRatio: number
): string | undefined {
  if (currentRatio >= WCAG_AA_THRESHOLD) return undefined;

  const targetRatio = WCAG_AA_THRESHOLD + 0.1; // Add small buffer to ensure we clearly pass the threshold
  const fgLum = foreground.luminance;
  const bgLum = background.luminance;

  // Calculate required luminance changes
  const requiredFgLumDark = (bgLum + CONTRAST_BASE) / targetRatio - CONTRAST_BASE;
  const requiredFgLumLight = (bgLum + CONTRAST_BASE) * targetRatio - CONTRAST_BASE;
  const requiredBgLumDark = (fgLum + CONTRAST_BASE) / targetRatio - CONTRAST_BASE;
  const requiredBgLumLight = (fgLum + CONTRAST_BASE) * targetRatio - CONTRAST_BASE;

  // Find the closest achievable option
  const options = [];

  if (requiredFgLumDark >= 0 && requiredFgLumDark <= 1) {
    const newFgColor = adjustLuminance(foreground, requiredFgLumDark);
    options.push(`Darken text to ${newFgColor.hex}`);
  }

  if (requiredFgLumLight >= 0 && requiredFgLumLight <= 1) {
    const newFgColor = adjustLuminance(foreground, requiredFgLumLight);
    options.push(`Lighten text to ${newFgColor.hex}`);
  }

  if (requiredBgLumDark >= 0 && requiredBgLumDark <= 1) {
    const newBgColor = adjustLuminance(background, requiredBgLumDark);
    options.push(`Darken background to ${newBgColor.hex}`);
  }

  if (requiredBgLumLight >= 0 && requiredBgLumLight <= 1) {
    const newBgColor = adjustLuminance(background, requiredBgLumLight);
    options.push(`Lighten background to ${newBgColor.hex}`);
  }

  return options.length > 0 ? options[0] : 'Increase contrast between colors';
}

/**
 * Adjusts a color's luminance to a target value
 */
function adjustLuminance(color: ColorInfo, targetLuminance: number): ColorInfo {
  const { h, s } = color.hsl;
  
  // Binary search for the correct lightness value
  let low = 0;
  let high = 100;
  let bestL = color.hsl.l;
  let bestLum = color.luminance;
  
  for (let i = 0; i < 20; i++) {
    const testL = (low + high) / 2;
    const testRgb = hslToRgb(h, s, testL);
    const testLum = getLuminance(testRgb.r, testRgb.g, testRgb.b);
    
    if (Math.abs(testLum - targetLuminance) < Math.abs(bestLum - targetLuminance)) {
      bestL = testL;
      bestLum = testLum;
    }
    
    if (testLum < targetLuminance) {
      low = testL;
    } else {
      high = testL;
    }
  }
  
  const newRgb = hslToRgb(h, s, bestL);
  return createColorInfo(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
}

/**
 * Creates a ColorInfo object from a hex string
 */
export function createColorInfo(hex: string): ColorInfo {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  return {
    hex: hex.toUpperCase(),
    rgb,
    hsl,
    luminance,
    name: getColorName(hex),
  };
}

/**
 * Simple color name approximation
 */
function getColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Basic color name logic
  if (s < 10) {
    if (l < 20) return 'Black';
    if (l > 80) return 'White';
    return 'Gray';
  }
  
  if (h < 15 || h >= 345) return 'Red';
  if (h < 45) return 'Orange';
  if (h < 75) return 'Yellow';
  if (h < 150) return 'Green';
  if (h < 210) return 'Blue';
  if (h < 270) return 'Purple';
  if (h < 330) return 'Pink';
  
  return 'Color';
}

/**
 * Extracts dominant colors from image data using enhanced median cut algorithm
 */
export function extractColorsFromImageData(
  imageData: ImageData,
  options: ImageExtractionOptions = { maxColors: 8, quality: 3 }
): ColorInfo[] {
  return extractColorsWithEnhancedAlgorithm(imageData, options);
}

/**
 * Median cut algorithm for color quantization
 */
function medianCut(
  pixels: Array<[number, number, number]>,
  maxColors: number
): Array<[number, number, number]> {
  if (maxColors === 1 || pixels.length === 0) {
    return [getAverageColor(pixels)];
  }
  
  if (pixels.length === 1) {
    return [pixels[0]];
  }
  
  // Find the channel with the greatest range
  const ranges = getColorRanges(pixels);
  const maxRange = Math.max(ranges.r, ranges.g, ranges.b);
  let sortChannel: 0 | 1 | 2;
  
  if (maxRange === ranges.r) sortChannel = 0;
  else if (maxRange === ranges.g) sortChannel = 1;
  else sortChannel = 2;
  
  // Sort pixels by the channel with greatest range
  pixels.sort((a, b) => a[sortChannel] - b[sortChannel]);
  
  // Split at median
  const median = Math.floor(pixels.length / 2);
  const left = pixels.slice(0, median);
  const right = pixels.slice(median);
  
  // Recursively apply median cut
  const leftColors = medianCut(left, Math.floor(maxColors / 2));
  const rightColors = medianCut(right, Math.ceil(maxColors / 2));
  
  return [...leftColors, ...rightColors];
}

/**
 * Gets color ranges for median cut algorithm
 */
function getColorRanges(pixels: Array<[number, number, number]>) {
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;
  
  for (const [r, g, b] of pixels) {
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minG = Math.min(minG, g);
    maxG = Math.max(maxG, g);
    minB = Math.min(minB, b);
    maxB = Math.max(maxB, b);
  }
  
  return {
    r: maxR - minR,
    g: maxG - minG,
    b: maxB - minB,
  };
}

/**
 * Calculates average color from pixel array
 */
function getAverageColor(pixels: Array<[number, number, number]>): [number, number, number] {
  if (pixels.length === 0) return [0, 0, 0];
  
  const sum = pixels.reduce(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
    [0, 0, 0]
  );
  
  return [
    Math.round(sum[0] / pixels.length),
    Math.round(sum[1] / pixels.length),
    Math.round(sum[2] / pixels.length),
  ];
}

/**
 * Generates color harmony based on color theory
 */
export function generateColorHarmony(options: ColorHarmonyOptions): ColorInfo[] {
  const { type, baseColor, variations } = options;
  const baseColorInfo = createColorInfo(baseColor);
  const { h: baseHue, s: baseSat, l: baseLum } = baseColorInfo.hsl;
  
  const colors: ColorInfo[] = [baseColorInfo];
  
  switch (type) {
    case 'complementary': {
      const rgb = hslToRgb((baseHue + 180) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb.r, rgb.g, rgb.b)));
    }
      break;
      
    case 'triadic': {
      const rgb1 = hslToRgb((baseHue + 120) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb1.r, rgb1.g, rgb1.b)));
      const rgb2 = hslToRgb((baseHue + 240) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb2.r, rgb2.g, rgb2.b)));
    }
      break;
      
    case 'analogous':
      for (let i = 1; i <= variations; i++) {
        const offset = (i * 30) % 360;
        const rgb1 = hslToRgb((baseHue + offset) % 360, baseSat, baseLum);
        colors.push(createColorInfo(rgbToHex(rgb1.r, rgb1.g, rgb1.b)));
        const rgb2 = hslToRgb((baseHue - offset + 360) % 360, baseSat, baseLum);
        colors.push(createColorInfo(rgbToHex(rgb2.r, rgb2.g, rgb2.b)));
      }
      break;
      
    case 'monochromatic':
      for (let i = 1; i <= variations; i++) {
        const lightness = Math.max(10, Math.min(90, baseLum + (i * 15) - (variations * 7.5)));
        const rgb = hslToRgb(baseHue, baseSat, lightness);
        colors.push(createColorInfo(rgbToHex(rgb.r, rgb.g, rgb.b)));
      }
      break;
      
    case 'tetradic': {
      const rgb1 = hslToRgb((baseHue + 90) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb1.r, rgb1.g, rgb1.b)));
      const rgb2 = hslToRgb((baseHue + 180) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb2.r, rgb2.g, rgb2.b)));
      const rgb3 = hslToRgb((baseHue + 270) % 360, baseSat, baseLum);
      colors.push(createColorInfo(rgbToHex(rgb3.r, rgb3.g, rgb3.b)));
    }
      break;
  }
  
  return colors.slice(0, Math.min(colors.length, 8)); // Limit to 8 colors
}

/**
 * Validates if a string is a valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

/**
 * Generates CSS variables from color palette
 */
export function generateCssVariables(colors: ColorInfo[]): string {
  const variables = colors.map((color, index) => {
    const name = `color-${index + 1}`;
    return `  --${name}: ${color.hex};`;
  }).join('\n');
  
  return `:root {\n${variables}\n}`;
}

/**
 * Generates SCSS variables from color palette
 */
export function generateScssVariables(colors: ColorInfo[]): string {
  return colors.map((color, index) => {
    const name = `color-${index + 1}`;
    return `$${name}: ${color.hex};`;
  }).join('\n');
}

/**
 * Generates Tailwind CSS config from color palette
 */
export function generateTailwindConfig(colors: ColorInfo[]): string {
  const colorObject = colors.reduce((acc, color, index) => {
    acc[`custom-${index + 1}`] = color.hex;
    return acc;
  }, {} as Record<string, string>);
  
  return `module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(colorObject, null, 8)}
    }
  }
}`;
}

/**
 * Generates JSON array from color palette
 */
export function generateJsonArray(colors: ColorInfo[]): string {
  const colorData = colors.map(color => ({
    hex: color.hex,
    rgb: color.rgb,
    hsl: color.hsl,
    name: color.name,
  }));
  
  return JSON.stringify(colorData, null, 2);
}

/**
 * Loads image from file and returns ImageData
 */
export function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      } catch {
        reject(new Error('Failed to extract image data'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Constants for color extraction
const COLOR_SIMILARITY_THRESHOLD = 25;
const MIN_LIGHTNESS_THRESHOLD = 20;
const MAX_LIGHTNESS_THRESHOLD = 80;
const MAX_RGB_DIFFERENCE = 765; // 255 * 3
const LIGHTNESS_PENALTY = 0.3;

// Constants for enhanced color extraction
const ALPHA_THRESHOLD = 128;
const DEFAULT_EXTRACTION_QUALITY = 3;
const COLOR_EXPANSION_FACTOR = 2;
const MAX_INITIAL_COLORS = 16;
const RGBA_PIXEL_SIZE = 4;

type RGBTuple = [number, number, number];

/**
 * Calculates Euclidean distance between two RGB colors
 */
function calculateColorDistance(color1: RGBTuple, color2: RGBTuple): number {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Filters out similar colors to maintain palette diversity
 */
function filterSimilarColors(
  colors: RGBTuple[],
  threshold: number = COLOR_SIMILARITY_THRESHOLD
): RGBTuple[] {
  const uniqueColors: RGBTuple[] = [];

  for (const color of colors) {
    const hasExistingSimilar = uniqueColors.some(existingColor =>
      calculateColorDistance(color, existingColor) < threshold
    );

    if (!hasExistingSimilar) {
      uniqueColors.push(color);
    }
  }

  return uniqueColors;
}

/**
 * Calculates visual interest score for color selection priority
 */
function calculateColorInterestScore(color: RGBTuple): number {
  const [r, g, b] = color;
  const { s, l } = rgbToHsl(r, g, b);

  const saturationScore = s / 100;
  const lightnessScore = (l > MIN_LIGHTNESS_THRESHOLD && l < MAX_LIGHTNESS_THRESHOLD)
    ? 1
    : LIGHTNESS_PENALTY;
  const diversityScore = (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)) / MAX_RGB_DIFFERENCE;

  return saturationScore * lightnessScore * (1 + diversityScore);
}

/**
 * Enhanced color extraction with diversity filtering and intelligent selection
 */
function extractColorsWithEnhancedAlgorithm(
  imageData: ImageData,
  options: ImageExtractionOptions = { maxColors: 8, quality: DEFAULT_EXTRACTION_QUALITY }
): ColorInfo[] {
  const { maxColors, quality = DEFAULT_EXTRACTION_QUALITY, region } = options;
  const pixels: RGBTuple[] = [];

  // Extract pixel data from specified region or entire image
  const { data, width, height } = imageData;
  const bounds = {
    startX: region?.x || 0,
    startY: region?.y || 0,
    endX: region ? Math.min(region.x + region.width, width) : width,
    endY: region ? Math.min(region.y + region.height, height) : height,
  };

  // Sample pixels with specified quality
  for (let y = bounds.startY; y < bounds.endY; y += quality) {
    for (let x = bounds.startX; x < bounds.endX; x += quality) {
      const pixelIndex = (y * width + x) * RGBA_PIXEL_SIZE;
      const rgba = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3],
      };

      // Include only non-transparent pixels
      if (rgba.a > ALPHA_THRESHOLD) {
        pixels.push([rgba.r, rgba.g, rgba.b]);
      }
    }
  }

  if (pixels.length === 0) {
    return [createColorInfo('#000000')];
  }

  // Extract initial set of dominant colors
  const initialColorCount = Math.min(maxColors * COLOR_EXPANSION_FACTOR, MAX_INITIAL_COLORS);
  const dominantColors = medianCut(pixels, initialColorCount);

  // Filter out similar colors for diversity
  const uniqueColors = filterSimilarColors(dominantColors);

  // Rank colors by visual interest and select the best ones
  const rankedColors = uniqueColors
    .map(color => ({
      color,
      interestScore: calculateColorInterestScore(color)
    }))
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, maxColors);

  return rankedColors.map(({ color }) =>
    createColorInfo(rgbToHex(color[0], color[1], color[2]))
  );
}

/**
 * Extracts colors from a specific region of image data
 */
export function extractColorsFromRegion(
  imageData: ImageData,
  region: { x: number; y: number; width: number; height: number },
  maxColors: number = 5
): ColorInfo[] {
  return extractColorsWithEnhancedAlgorithm(imageData, {
    maxColors,
    quality: 2,
    region,
  });
}

/**
 * Generates a random color palette
 */
export function generateRandomPalette(count: number = 5): ColorInfo[] {
  const colors: ColorInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 40 + Math.floor(Math.random() * 60); // 40-100%
    const lightness = 30 + Math.floor(Math.random() * 40); // 30-70%
    
    const rgb = hslToRgb(hue, saturation, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    colors.push(createColorInfo(hex));
  }
  
  return colors;
}

/**
 * Sorts colors by various criteria
 */
export function sortColors(colors: ColorInfo[], criteria: 'hue' | 'saturation' | 'lightness' | 'luminance'): ColorInfo[] {
  return [...colors].sort((a, b) => {
    switch (criteria) {
      case 'hue':
        return a.hsl.h - b.hsl.h;
      case 'saturation':
        return b.hsl.s - a.hsl.s;
      case 'lightness':
        return b.hsl.l - a.hsl.l;
      case 'luminance':
        return b.luminance - a.luminance;
      default:
        return 0;
    }
  });
}