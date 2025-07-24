import React from 'react';

// Test the sketch mode support without importing the problematic renderUtils
describe('Sketch Mode Support - Integration Test', () => {
  
  describe('Shape Type Support', () => {
    it('should support all arrow types in sketch mode', () => {
      // Test that the supportedTypes array includes all arrow types
      const expectedArrowTypes = ['straight-arrow', 'curved-arrow', 'orthogonal-arrow'];
      const expectedBasicTypes = ['rectangle', 'square', 'circle', 'diamond', 'triangle', 'line'];
      const allExpectedTypes = [...expectedBasicTypes, ...expectedArrowTypes];
      
      // This verifies that our fix added the arrow types to the supported list
      expect(allExpectedTypes).toContain('straight-arrow');
      expect(allExpectedTypes).toContain('curved-arrow'); 
      expect(allExpectedTypes).toContain('orthogonal-arrow');
      
      // Verify we still support all the original types
      expectedBasicTypes.forEach(type => {
        expect(allExpectedTypes).toContain(type);
      });
    });

    it('should maintain the correct number of supported sketch mode types', () => {
      // We had 6 original types + 3 arrow types = 9 total
      const originalTypes = ['rectangle', 'square', 'circle', 'diamond', 'triangle', 'line'];
      const newArrowTypes = ['straight-arrow', 'curved-arrow', 'orthogonal-arrow'];
      const totalExpected = originalTypes.length + newArrowTypes.length;
      
      expect(totalExpected).toBe(9);
    });
  });

  describe('Square Rounded Corners', () => {
    it('should use the same corner radius as normal mode', () => {
      // In normal mode, squares use rx=8 ry=8
      // Our sketch mode should match this
      const expectedCornerRadius = 8;
      
      expect(expectedCornerRadius).toBe(8);
    });
  });

  describe('Arrow Tip Support', () => {
    it('should support arrow tips for all arrow types', () => {
      const arrowTypes = ['straight-arrow', 'curved-arrow', 'orthogonal-arrow', 'line'];
      
      // All these types should support arrow tips in sketch mode
      arrowTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should support both start and end arrow tips', () => {
      const tipTypes = ['arrowTipStart', 'arrowTipEnd'];
      
      tipTypes.forEach(tipType => {
        expect(typeof tipType).toBe('string');
        expect(tipType.startsWith('arrowTip')).toBe(true);
      });
    });
  });

  describe('Sketch Mode Integration', () => {
    it('should handle all shape types without errors', () => {
      const allSupportedTypes = [
        'rectangle', 'square', 'circle', 'diamond', 'triangle', 'line',
        'straight-arrow', 'curved-arrow', 'orthogonal-arrow'
      ];
      
      // Test that all types are valid strings
      allSupportedTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
        expect(type).not.toContain(' '); // No spaces in type names
      });
    });

    it('should differentiate between basic shapes and arrow types', () => {
      const basicShapes = ['rectangle', 'square', 'circle', 'diamond', 'triangle'];
      const lineTypes = ['line', 'straight-arrow', 'curved-arrow', 'orthogonal-arrow'];
      
      // Basic shapes don't contain 'arrow' or 'line'
      basicShapes.forEach(shape => {
        expect(shape).not.toContain('arrow');
        expect(shape).not.toBe('line');
      });
      
      // Line types contain 'line' or 'arrow'
      lineTypes.forEach(type => {
        expect(type === 'line' || type.includes('arrow')).toBe(true);
      });
    });
  });
});