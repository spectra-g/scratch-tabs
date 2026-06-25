export interface ColorInfo {
  id: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name?: string;
  luminance: number;
  isLocked: boolean;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'FAIL';
  suggestion?: string;
}

export interface AccessibilityPair {
  foreground: ColorInfo;
  background: ColorInfo;
  foregroundIndex: number;
  backgroundIndex: number;
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

export interface ColourPaletteState {
  type: 'colourpalette';
  colors: ColorInfo[];
  sourceImageUrl: string | null;
  extractionRegion: { x: number; y: number; width: number; height: number } | null;
  initialOpenPanel?: 'image' | 'preview' | 'accessibility' | 'export' | 'history' | null;
  uiMapping: UIPreviewMapping;
  selectedExportFormat: string;
  harmonyType: 'complementary' | 'triadic' | 'analogous' | 'monochromatic' | 'tetradic';
  baseColor: string;
  history?: ColorInfo[][];
}

export interface ColourPaletteImagePayload {
  sourceImageUrl?: string;
  sourceTitle?: string;
  initialColors?: string[];
  extractionRegion?: { x: number; y: number; width: number; height: number };
  samplePoint?: { x: number; y: number };
  openPanel?: 'image' | 'preview' | 'accessibility' | 'export';
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
