import { generateMappingPresets, applyPresetWithLocks } from '../presetUtils';
import { createColorInfo } from '../colourUtils';
import { UIPreviewMapping } from '../../types';

describe('presetUtils', () => {
  const mockColors = [
    createColorInfo('#FF0000'), // Red
    createColorInfo('#00FF00'), // Green
    createColorInfo('#0000FF'), // Blue
    createColorInfo('#FFFF00'), // Yellow
  ];

  const fallbackMapping: UIPreviewMapping = {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    border: '#E5E7EB',
  };

  describe('generateMappingPresets', () => {
    it('should return fallback mapping when no colors provided', () => {
      const presets = generateMappingPresets([], fallbackMapping);
      expect(presets).toEqual([fallbackMapping]);
    });

    it('should generate 8 different presets', () => {
      const presets = generateMappingPresets(mockColors, fallbackMapping);
      expect(presets).toHaveLength(8);
    });

    it('should use colors from the provided palette', () => {
      const presets = generateMappingPresets(mockColors, fallbackMapping);

      presets.forEach(preset => {
        Object.values(preset).forEach(color => {
          // Each color should be from our mock colors
          const isFromMockColors = mockColors.some(mockColor => mockColor.hex === color);
          expect(isFromMockColors).toBe(true);
        });
      });
    });

    it('should generate different presets', () => {
      const presets = generateMappingPresets(mockColors, fallbackMapping);

      // Compare first two presets - they should be different
      expect(presets[0]).not.toEqual(presets[1]);

      // All presets should have valid structure
      presets.forEach(preset => {
        expect(preset).toHaveProperty('background');
        expect(preset).toHaveProperty('text');
        expect(preset).toHaveProperty('primary');
        expect(preset).toHaveProperty('secondary');
        expect(preset).toHaveProperty('accent');
        expect(preset).toHaveProperty('border');
      });
    });

    it('should handle single color correctly', () => {
      const singleColor = [createColorInfo('#FF0000')];
      const presets = generateMappingPresets(singleColor, fallbackMapping);

      expect(presets).toHaveLength(8);

      // All colors in all presets should be the single color (red)
      presets.forEach(preset => {
        Object.values(preset).forEach(color => {
          expect(color).toBe('#FF0000');
        });
      });
    });

    it('should wrap around colors when more positions than colors', () => {
      const twoColors = [createColorInfo('#FF0000'), createColorInfo('#00FF00')];
      const presets = generateMappingPresets(twoColors, fallbackMapping);

      presets.forEach(preset => {
        Object.values(preset).forEach(color => {
          // Should only use the two provided colors (wrapping around)
          expect(['#FF0000', '#00FF00']).toContain(color);
        });
      });
    });
  });

  describe('applyPresetWithLocks', () => {
    const currentMapping: UIPreviewMapping = {
      background: '#CURRENT_BG',
      text: '#CURRENT_TEXT',
      primary: '#CURRENT_PRIMARY',
      secondary: '#CURRENT_SECONDARY',
      accent: '#CURRENT_ACCENT',
      border: '#CURRENT_BORDER',
    };

    const newMapping: UIPreviewMapping = {
      background: '#NEW_BG',
      text: '#NEW_TEXT',
      primary: '#NEW_PRIMARY',
      secondary: '#NEW_SECONDARY',
      accent: '#NEW_ACCENT',
      border: '#NEW_BORDER',
    };

    it('should apply new mapping when no elements are locked', () => {
      const lockedElements = new Set<keyof UIPreviewMapping>();
      const result = applyPresetWithLocks(newMapping, currentMapping, lockedElements);

      expect(result).toEqual(newMapping);
    });

    it('should preserve locked elements from current mapping', () => {
      const lockedElements = new Set<keyof UIPreviewMapping>(['background', 'text']);
      const result = applyPresetWithLocks(newMapping, currentMapping, lockedElements);

      expect(result).toEqual({
        background: '#CURRENT_BG', // Preserved
        text: '#CURRENT_TEXT', // Preserved
        primary: '#NEW_PRIMARY', // Updated
        secondary: '#NEW_SECONDARY', // Updated
        accent: '#NEW_ACCENT', // Updated
        border: '#NEW_BORDER', // Updated
      });
    });

    it('should handle all elements locked', () => {
      const lockedElements = new Set<keyof UIPreviewMapping>([
        'background', 'text', 'primary', 'secondary', 'accent', 'border'
      ]);
      const result = applyPresetWithLocks(newMapping, currentMapping, lockedElements);

      expect(result).toEqual(currentMapping);
    });

    it('should handle single locked element', () => {
      const lockedElements = new Set<keyof UIPreviewMapping>(['primary']);
      const result = applyPresetWithLocks(newMapping, currentMapping, lockedElements);

      expect(result).toEqual({
        background: '#NEW_BG',
        text: '#NEW_TEXT',
        primary: '#CURRENT_PRIMARY', // Only this should be preserved
        secondary: '#NEW_SECONDARY',
        accent: '#NEW_ACCENT',
        border: '#NEW_BORDER',
      });
    });

    it('should not mutate the original mappings', () => {
      const lockedElements = new Set<keyof UIPreviewMapping>(['background']);
      const originalNewMapping = { ...newMapping };
      const originalCurrentMapping = { ...currentMapping };

      applyPresetWithLocks(newMapping, currentMapping, lockedElements);

      expect(newMapping).toEqual(originalNewMapping);
      expect(currentMapping).toEqual(originalCurrentMapping);
    });
  });
});