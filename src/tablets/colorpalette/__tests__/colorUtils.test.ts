import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  getLuminance,
  getContrastRatio,
  evaluateContrast,
  generateContrastSuggestion,
  createColorInfo,
  isValidHexColor,
  generateCssVariables,
  generateScssVariables,
  generateTailwindConfig,
  generateJsonArray,
  generateRandomPalette,
  sortColors,
  extractColorsFromImageData,
  extractColorsFromRegion,
} from '../utils/colorUtils';

// Mock ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

// Set up global ImageData for tests
(global as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex to RGB', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should convert 3-digit hex to RGB', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle hex without hash', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('should handle edge values', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('should clamp values outside 0-255 range', () => {
      expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
    });
  });

  describe('rgbToHsl', () => {
    it('should convert RGB to HSL', () => {
      expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
      expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
      expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 });
    });

    it('should handle grayscale colors', () => {
      expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 });
      expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 });
      expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 });
    });
  });

  describe('hslToRgb', () => {
    it('should convert HSL to RGB', () => {
      expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
      expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
      expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle grayscale colors', () => {
      expect(hslToRgb(0, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
      expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
      expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance correctly', () => {
      expect(getLuminance(255, 255, 255)).toBeCloseTo(1, 2);
      expect(getLuminance(0, 0, 0)).toBeCloseTo(0, 2);
      expect(getLuminance(255, 0, 0)).toBeCloseTo(0.2126, 2);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio between colors', () => {
      const white = createColorInfo('#FFFFFF');
      const black = createColorInfo('#000000');
      
      const ratio = getContrastRatio(white, black);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should handle same colors', () => {
      const blue = createColorInfo('#3B82F6');
      const ratio = getContrastRatio(blue, blue);
      expect(ratio).toBe(1);
    });
  });

  describe('evaluateContrast', () => {
    it('should evaluate contrast levels correctly', () => {
      expect(evaluateContrast(21)).toBe('AAA');
      expect(evaluateContrast(7)).toBe('AAA');
      expect(evaluateContrast(4.5)).toBe('AA');
      expect(evaluateContrast(3)).toBe('FAIL');
    });
  });

  describe('generateContrastSuggestion', () => {
    it('should generate suggestions for failing contrast', () => {
      const lightGray = createColorInfo('#CCCCCC');
      const white = createColorInfo('#FFFFFF');
      
      const suggestion = generateContrastSuggestion(lightGray, white, 1.5);
      expect(suggestion).toBeDefined();
      expect(suggestion).toContain('#');
    });

    it('should return undefined for passing contrast', () => {
      const black = createColorInfo('#000000');
      const white = createColorInfo('#FFFFFF');

      const suggestion = generateContrastSuggestion(black, white, 21);
      expect(suggestion).toBeUndefined();
    });

    it('should generate suggestions that achieve target contrast ratio with buffer', () => {
      // Test case that was previously failing at 4.49:1
      const darkRed = createColorInfo('#924A45');
      const lightBg = createColorInfo('#BDDEDA');

      const suggestion = generateContrastSuggestion(darkRed, lightBg, 4.49);
      expect(suggestion).toBeDefined();

      if (suggestion) {
        // Extract the suggested hex color
        const newHexMatch = suggestion.match(/#[A-Fa-f0-9]{6}/);
        expect(newHexMatch).toBeTruthy();

        if (newHexMatch) {
          const newColor = createColorInfo(newHexMatch[0]);
          const newRatio = getContrastRatio(newColor, lightBg);

          // Should achieve at least AA standard (4.5:1) with buffer
          expect(newRatio).toBeGreaterThan(4.5);
        }
      }
    });
  });

  describe('createColorInfo', () => {
    it('should create complete color info object', () => {
      const color = createColorInfo('#3B82F6');
      
      expect(color.hex).toBe('#3B82F6');
      expect(color.rgb).toEqual({ r: 59, g: 130, b: 246 });
      expect(color.hsl).toBeDefined();
      expect(color.luminance).toBeDefined();
      expect(color.name).toBeDefined();
    });
  });

  describe('isValidHexColor', () => {
    it('should validate hex colors correctly', () => {
      expect(isValidHexColor('#FF0000')).toBe(true);
      expect(isValidHexColor('#F00')).toBe(true);
      expect(isValidHexColor('FF0000')).toBe(false);
      expect(isValidHexColor('#GG0000')).toBe(false);
      expect(isValidHexColor('#FF00')).toBe(false);
    });
  });

  describe('generateCssVariables', () => {
    it('should generate CSS variables', () => {
      const colors = [
        createColorInfo('#FF0000'),
        createColorInfo('#00FF00'),
      ];
      
      const css = generateCssVariables(colors);
      expect(css).toContain(':root {');
      expect(css).toContain('--color-1: #FF0000;');
      expect(css).toContain('--color-2: #00FF00;');
    });
  });

  describe('generateScssVariables', () => {
    it('should generate SCSS variables', () => {
      const colors = [
        createColorInfo('#FF0000'),
        createColorInfo('#00FF00'),
      ];
      
      const scss = generateScssVariables(colors);
      expect(scss).toContain('$color-1: #FF0000;');
      expect(scss).toContain('$color-2: #00FF00;');
    });
  });

  describe('generateTailwindConfig', () => {
    it('should generate Tailwind config', () => {
      const colors = [createColorInfo('#FF0000')];
      
      const config = generateTailwindConfig(colors);
      expect(config).toContain('module.exports = {');
      expect(config).toContain('theme: {');
      expect(config).toContain('extend: {');
      expect(config).toContain('colors: {');
      expect(config).toContain('"custom-1": "#FF0000"');
    });
  });

  describe('generateJsonArray', () => {
    it('should generate JSON array', () => {
      const colors = [createColorInfo('#FF0000')];
      
      const json = generateJsonArray(colors);
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toHaveProperty('hex', '#FF0000');
      expect(parsed[0]).toHaveProperty('rgb');
      expect(parsed[0]).toHaveProperty('hsl');
    });
  });

  describe('generateRandomPalette', () => {
    it('should generate random palette with specified count', () => {
      const palette = generateRandomPalette(5);
      expect(palette).toHaveLength(5);
      palette.forEach(color => {
        expect(color.hex).toMatch(/^#[A-F0-9]{6}$/);
      });
    });

    it('should generate different palettes on multiple calls', () => {
      const palette1 = generateRandomPalette(3);
      const palette2 = generateRandomPalette(3);
      
      // Very unlikely to be identical
      expect(palette1).not.toEqual(palette2);
    });
  });

  describe('sortColors', () => {
    it('should sort colors by hue', () => {
      const colors = [
        createColorInfo('#FF0000'), // Red (0°)
        createColorInfo('#00FF00'), // Green (120°)
        createColorInfo('#0000FF'), // Blue (240°)
      ];
      
      const sorted = sortColors(colors, 'hue');
      expect(sorted[0].hsl.h).toBeLessThanOrEqual(sorted[1].hsl.h);
      expect(sorted[1].hsl.h).toBeLessThanOrEqual(sorted[2].hsl.h);
    });

    it('should sort colors by luminance', () => {
      const colors = [
        createColorInfo('#FFFFFF'), // High luminance
        createColorInfo('#808080'), // Medium luminance
        createColorInfo('#000000'), // Low luminance
      ];
      
      const sorted = sortColors(colors, 'luminance');
      expect(sorted[0].luminance).toBeGreaterThanOrEqual(sorted[1].luminance);
      expect(sorted[1].luminance).toBeGreaterThanOrEqual(sorted[2].luminance);
    });
  });

  describe('Image Color Extraction', () => {
    // Helper function to create test ImageData
    function createTestImageData(width: number, height: number, pixelData: number[][]): ImageData {
      const data = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < pixelData.length; i++) {
        const [r, g, b, a = 255] = pixelData[i];
        const pixelIndex = i * 4;
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = a;
      }

      return new ImageData(data, width, height);
    }

    describe('extractColorsFromImageData', () => {
      it('should extract colors from simple ImageData', () => {
        const imageData = createTestImageData(2, 2, [
          [255, 0, 0],    // Red
          [0, 255, 0],    // Green
          [0, 0, 255],    // Blue
          [255, 255, 255] // White
        ]);

        const colors = extractColorsFromImageData(imageData, { maxColors: 4, quality: 1 });

        expect(colors).toHaveLength(4);
        expect(colors.every(color => color.hex.match(/^#[A-F0-9]{6}$/))).toBe(true);
      });

      it('should handle transparent pixels', () => {
        const imageData = createTestImageData(2, 2, [
          [255, 0, 0, 255],  // Red (opaque)
          [0, 255, 0, 0],    // Green (transparent)
          [0, 0, 255, 255],  // Blue (opaque)
          [255, 255, 255, 128] // White (semi-transparent)
        ]);

        const colors = extractColorsFromImageData(imageData, { maxColors: 4, quality: 1 });

        // Should extract colors from non-transparent pixels
        expect(colors.length).toBeGreaterThan(0);
        expect(colors.length).toBeLessThanOrEqual(4);
      });

      it('should limit colors to maxColors parameter', () => {
        const imageData = createTestImageData(3, 3, [
          [255, 0, 0], [0, 255, 0], [0, 0, 255],
          [255, 255, 0], [255, 0, 255], [0, 255, 255],
          [128, 128, 128], [64, 64, 64], [192, 192, 192]
        ]);

        const colors = extractColorsFromImageData(imageData, { maxColors: 3, quality: 1 });

        expect(colors).toHaveLength(3);
      });

      it('should return black for empty image', () => {
        const imageData = createTestImageData(1, 1, [[0, 0, 0, 0]]); // Transparent black

        const colors = extractColorsFromImageData(imageData, { maxColors: 5, quality: 1 });

        expect(colors).toHaveLength(1);
        expect(colors[0].hex).toBe('#000000');
      });
    });

    describe('extractColorsFromRegion', () => {
      it('should extract colors from specified region', () => {
        const imageData = createTestImageData(4, 4, [
          [255, 0, 0], [255, 0, 0], [0, 255, 0], [0, 255, 0],
          [255, 0, 0], [255, 0, 0], [0, 255, 0], [0, 255, 0],
          [0, 0, 255], [0, 0, 255], [255, 255, 0], [255, 255, 0],
          [0, 0, 255], [0, 0, 255], [255, 255, 0], [255, 255, 0]
        ]);

        // Extract from top-left quadrant (should be mostly red)
        const region = { x: 0, y: 0, width: 2, height: 2 };
        const colors = extractColorsFromRegion(imageData, region, 3);

        expect(colors.length).toBeGreaterThan(0);
        expect(colors.length).toBeLessThanOrEqual(3);
      });

      it('should handle region boundaries correctly', () => {
        const imageData = createTestImageData(2, 2, [
          [255, 0, 0], [0, 255, 0],
          [0, 0, 255], [255, 255, 255]
        ]);

        // Region that goes outside image bounds
        const region = { x: 1, y: 1, width: 5, height: 5 };
        const colors = extractColorsFromRegion(imageData, region, 2);

        // Should not crash and should return valid colors
        expect(colors.length).toBeGreaterThan(0);
        expect(colors.every(color => typeof color.hex === 'string')).toBe(true);
      });
    });

    describe('Color Diversity and Quality', () => {
      it('should prioritize vibrant colors over dull ones', () => {
        const imageData = createTestImageData(3, 3, [
          [240, 240, 240], [240, 240, 240], [240, 240, 240], // Dull grays
          [240, 240, 240], [255, 0, 0], [240, 240, 240],     // One bright red
          [240, 240, 240], [240, 240, 240], [240, 240, 240]  // More dull grays
        ]);

        const colors = extractColorsFromImageData(imageData, { maxColors: 2, quality: 1 });

        // Should prefer the vibrant red over the dull grays
        const hasVibrantColor = colors.some(color => {
          const { s } = color.hsl;
          return s > 50; // High saturation indicates vibrant color
        });

        expect(hasVibrantColor).toBe(true);
      });

      it('should remove similar colors for diversity', () => {
        const imageData = createTestImageData(3, 3, [
          [255, 0, 0], [254, 1, 1], [253, 2, 2],     // Very similar reds
          [0, 255, 0], [1, 254, 1], [2, 253, 2],     // Very similar greens
          [0, 0, 255], [1, 1, 254], [2, 2, 253]      // Very similar blues
        ]);

        const colors = extractColorsFromImageData(imageData, { maxColors: 6, quality: 1 });

        // Should have fewer than 9 colors due to similarity filtering
        expect(colors.length).toBeLessThan(9);

        // Check that colors are reasonably diverse
        for (let i = 0; i < colors.length - 1; i++) {
          for (let j = i + 1; j < colors.length; j++) {
            const color1 = colors[i];
            const color2 = colors[j];
            expect(color1.hex).not.toBe(color2.hex);
          }
        }
      });
    });
  });
});