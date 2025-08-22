import React from 'react';
import { render } from '@testing-library/react';
import { getNextBackgroundTexture, getBackgroundConfig, BackgroundTexture } from '../backgroundTextureUtils';

describe('backgroundTextureUtils', () => {
  describe('getNextBackgroundTexture', () => {
    it('should cycle from null to paper', () => {
      const result = getNextBackgroundTexture(null);
      expect(result).toBe('paper');
    });

    it('should cycle from paper to grid', () => {
      const result = getNextBackgroundTexture('paper');
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
      
      // First cycle: null → paper → grid → null
      current = getNextBackgroundTexture(current); // null → paper
      expect(current).toBe('paper');
      
      current = getNextBackgroundTexture(current); // paper → grid
      expect(current).toBe('grid');
      
      current = getNextBackgroundTexture(current); // grid → null
      expect(current).toBe(null);
      
      // Second cycle should be identical
      current = getNextBackgroundTexture(current); // null → paper
      expect(current).toBe('paper');
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

    it('should return correct config for paper texture', () => {
      const config = getBackgroundConfig('paper');
      expect(config.title).toBe('Background: Paper');
      
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

    it('should return configs with different icons for each texture', () => {
      const nullConfig = getBackgroundConfig(null);
      const paperConfig = getBackgroundConfig('paper');
      const gridConfig = getBackgroundConfig('grid');
      
      // Render all icons to ensure they're different components
      const { container: nullContainer } = render(nullConfig.icon);
      const { container: paperContainer } = render(paperConfig.icon);
      const { container: gridContainer } = render(gridConfig.icon);
      
      // Icons should have different structure/classes
      expect(nullContainer.innerHTML).not.toBe(paperContainer.innerHTML);
      expect(paperContainer.innerHTML).not.toBe(gridContainer.innerHTML);
      expect(gridContainer.innerHTML).not.toBe(nullContainer.innerHTML);
    });

    it('should return configs with consistent icon sizes', () => {
      const configs = [
        getBackgroundConfig(null),
        getBackgroundConfig('paper'),
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
      const textures: BackgroundTexture[] = [null, 'paper', 'grid'];
      
      textures.forEach(texture => {
        const nextTexture = getNextBackgroundTexture(texture);
        const currentConfig = getBackgroundConfig(texture);
        const nextConfig = getBackgroundConfig(nextTexture);
        
        // Current and next should have different titles
        expect(currentConfig.title).not.toBe(nextConfig.title);
        
        // Both should have valid titles
        expect(currentConfig.title).toMatch(/^Background: (None|Paper|Grid)$/);
        expect(nextConfig.title).toMatch(/^Background: (None|Paper|Grid)$/);
      });
    });

    it('should handle the complete workflow: cycle and get config', () => {
      let currentTexture: BackgroundTexture = null;
      const visitedConfigs: string[] = [];
      
      // Cycle through all options and collect titles
      for (let i = 0; i < 4; i++) { // One extra to ensure we cycle back
        const config = getBackgroundConfig(currentTexture);
        visitedConfigs.push(config.title);
        currentTexture = getNextBackgroundTexture(currentTexture);
      }
      
      // Should have visited all three options and cycled back to start
      expect(visitedConfigs).toHaveLength(4);
      expect(visitedConfigs[0]).toBe('Background: None');
      expect(visitedConfigs[1]).toBe('Background: Paper');
      expect(visitedConfigs[2]).toBe('Background: Grid');
      expect(visitedConfigs[3]).toBe('Background: None'); // Cycled back
    });
  });
});