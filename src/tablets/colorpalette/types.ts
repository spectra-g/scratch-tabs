export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name?: string;
  luminance: number;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'FAIL';
  suggestion?: string;
}

export interface AccessibilityPair {
  foreground: ColorInfo;
  background: ColorInfo;
  contrast: ContrastResult;
}

export interface UIPreviewMapping {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
}

export interface ExportFormat {
  name: string;
  extension: string;
  generator: (colors: ColorInfo[]) => string;
}

export interface ColorPaletteState {
  type: 'colorpalette';
  colors: ColorInfo[];
  activeColorIndex: number;
  generationMethod: 'manual' | 'image' | 'harmony';
  sourceImageUrl: string | null;
  sourceImageData: ImageData | null;
  extractionRegion: { x: number; y: number; width: number; height: number } | null;
  uiMapping: UIPreviewMapping;
  selectedExportFormat: string;
  isExtracting: boolean;
  error: string | null;
  harmonyType: 'complementary' | 'triadic' | 'analogous' | 'monochromatic' | 'tetradic';
  baseColor: string;
}

export interface ImageExtractionOptions {
  maxColors: number;
  quality: number;
  region?: { x: number; y: number; width: number; height: number };
}

export interface ColorHarmonyOptions {
  type: 'complementary' | 'triadic' | 'analogous' | 'monochromatic' | 'tetradic';
  baseColor: string;
  variations: number;
}