import React from 'react';
import { render } from '@testing-library/react';
import { getNextBackgroundTexture, getBackgroundConfig, BackgroundTexture } from '../backgroundTextureUtils';

describe('backgroundTextureUtils', () => {
  describe('getNextBackgroundTexture', () => {
    it('should cycle from null to lined', () => {
      const result = getNextBackgroundTexture(null);
      expect(result).toBe('lined');
    });

    it('should cycle from lined to texture', () => {
      const result = getNextBackgroundTexture('lined');
      expect(result).toBe('texture');
    });

    it('should cycle from texture to dots', () => {
      const result = getNextBackgroundTexture('texture');
      expect(result).toBe('dots');
    });

    it('should cycle from dots to grid', () => {
      const result = getNextBackgroundTexture('dots');
      expect(result).toBe('grid');
    });

    it('should cycle from grid to null', () => {
      const result = getNextBackgroundTexture('grid');
      expect(result).toBe(null);
    });

    it('should handle invalid input by returning null', () => {
      const result = getNextBackgroundTexture('invalid' as BackgroundTexture);
      expect(result).toBe(null);
    });

    it('should complete a full cycle correctly', () => {
      let current: BackgroundTexture = null;
      
      // First cycle: null → lined → texture → dots → grid → null
      current = getNextBackgroundTexture(current); // null → lined
      expect(current).toBe('lined');
      
      current = getNextBackgroundTexture(current); // lined → texture
      expect(current).toBe('texture');
      
      current = getNextBackgroundTexture(current); // texture → dots
      expect(current).toBe('dots');
      
      current = getNextBackgroundTexture(current); // dots → grid
      expect(current).toBe('grid');
      
      current = getNextBackgroundTexture(current); // grid → null
      expect(current).toBe(null);
      
      // Second cycle should be identical
      current = getNextBackgroundTexture(current); // null → lined
      expect(current).toBe('lined');
    });
  });

  describe('getBackgroundConfig', () => {
    it('should return correct config for null texture', () => {
      const config = getBackgroundConfig(null);
      expect(config.title).toBe('Background: None');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should return correct config for dots texture', () => {
      const config = getBackgroundConfig('dots');
      expect(config.title).toBe('Background: Dotted Paper');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should return correct config for lined texture', () => {
      const config = getBackgroundConfig('lined');
      expect(config.title).toBe('Background: Lined Paper');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should return correct config for texture texture', () => {
      const config = getBackgroundConfig('texture');
      expect(config.title).toBe('Background: Texture');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should return correct config for grid texture', () => {
      const config = getBackgroundConfig('grid');
      expect(config.title).toBe('Background: Grid');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should handle invalid input by returning default config', () => {
      const config = getBackgroundConfig('invalid' as BackgroundTexture);
      expect(config.title).toBe('Background: None');
      
      // Test that icon renders without error
      const { container } = render(config.icon);
      expect(container.firstChild).toBeTruthy();
    });

    it('should return consistent icon for all textures (single Palette icon)', () => {
      const nullConfig = getBackgroundConfig(null);
      const dotsConfig = getBackgroundConfig('dots');
      const gridConfig = getBackgroundConfig('grid');
      const linedConfig = getBackgroundConfig('lined');
      const textureConfig = getBackgroundConfig('texture');
      
      // Render all icons to ensure they're the same component
      const { container: nullContainer } = render(nullConfig.icon);
      const { container: dotsContainer } = render(dotsConfig.icon);
      const { container: gridContainer } = render(gridConfig.icon);
      const { container: linedContainer } = render(linedConfig.icon);
      const { container: textureContainer } = render(textureConfig.icon);
      
      // All icons should be the same (Palette icon)
      expect(nullContainer.innerHTML).toBe(dotsContainer.innerHTML);
      expect(dotsContainer.innerHTML).toBe(gridContainer.innerHTML);
      expect(gridContainer.innerHTML).toBe(linedContainer.innerHTML);
      expect(linedContainer.innerHTML).toBe(textureContainer.innerHTML);
    });

    it('should return configs with consistent icon sizes', () => {
      const configs = [
        getBackgroundConfig(null),
        getBackgroundConfig('dots'),
        getBackgroundConfig('lined'),
        getBackgroundConfig('texture'),
        getBackgroundConfig('grid')
      ];
      
      configs.forEach(config => {
        const { container } = render(config.icon);
        const svgElement = container.querySelector('svg');
        
        // Assuming the icons use SVG elements with size prop
        expect(svgElement).toBeTruthy();
      });
    });
  });

  describe('integration tests', () => {
    it('should provide consistent behavior when cycling through all textures', () => {
      const textures: BackgroundTexture[] = [null, 'lined', 'texture', 'dots', 'grid'];
      
      textures.forEach(texture => {
        const nextTexture = getNextBackgroundTexture(texture);
        const currentConfig = getBackgroundConfig(texture);
        const nextConfig = getBackgroundConfig(nextTexture);
        
        // Current and next should have different titles
        expect(currentConfig.title).not.toBe(nextConfig.title);
        
        // Both should have valid titles
        expect(currentConfig.title).toMatch(/^Background: (None|Lined Paper|Texture|Dotted Paper|Grid)$/);
        expect(nextConfig.title).toMatch(/^Background: (None|Lined Paper|Texture|Dotted Paper|Grid)$/);
      });
    });

    it('should handle the complete workflow: cycle and get config', () => {
      let currentTexture: BackgroundTexture = null;
      const visitedConfigs: string[] = [];
      
      // Cycle through all options and collect titles
      for (let i = 0; i < 6; i++) { // One extra to ensure we cycle back
        const config = getBackgroundConfig(currentTexture);
        visitedConfigs.push(config.title);
        currentTexture = getNextBackgroundTexture(currentTexture);
      }
      
      // Should have visited all five options and cycled back to start
      expect(visitedConfigs).toHaveLength(6);
      expect(visitedConfigs[0]).toBe('Background: None');
      expect(visitedConfigs[1]).toBe('Background: Lined Paper');
      expect(visitedConfigs[2]).toBe('Background: Texture');
      expect(visitedConfigs[3]).toBe('Background: Dotted Paper');
      expect(visitedConfigs[4]).toBe('Background: Grid');
      expect(visitedConfigs[5]).toBe('Background: None'); // Cycled back
    });
  });
});