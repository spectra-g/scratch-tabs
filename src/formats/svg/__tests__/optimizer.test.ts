import { basicCleanup, validateSvg, extractSvgMetadata, generateOptimizationSuggestions, optimizeWithSvgo } from '../utils/optimizer';

describe('SVG Optimizer Utils', () => {
  describe('optimizeWithSvgo', () => {
    it('should optimize valid SVG content', async () => {
      const svg = '<svg><g>  <rect x="10.123456" y="20.789012" />  </g></svg>';
      const result = await optimizeWithSvgo(svg);
      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(svg.length);
    });

    it('should handle empty content', async () => {
      const result = await optimizeWithSvgo('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only content', async () => {
      const result = await optimizeWithSvgo('   ');
      expect(result).toBe('');
    });

    it('should fallback to basic cleanup on advanced optimization failure', async () => {
      // Mock DOMParser to throw an error to test fallback
      const originalDOMParser = global.DOMParser;
      global.DOMParser = jest.fn(() => ({
        parseFromString: jest.fn(() => {
          throw new Error('Mock DOM parsing error');
        })
      })) as any;

      const svg = '<svg><rect /></svg>';
      const result = await optimizeWithSvgo(svg);
      
      // Should still return a result (basic cleanup)
      expect(result).toBeTruthy();
      expect(result).toContain('<rect />');
      
      // Restore original DOMParser
      global.DOMParser = originalDOMParser;
    });

    it('should optimize path data', async () => {
      const svg = '<svg><path d="M 10.123456 , 20.789012 L 30.456789 , 40.123456" /></svg>';
      const result = await optimizeWithSvgo(svg);
      expect(result).toContain('M10.12,20.79L30.46,40.12');
    });

    it('should remove unused definitions', async () => {
      const svg = `
        <svg>
          <defs>
            <linearGradient id="used">
              <stop offset="0%" stop-color="red"/>
            </linearGradient>
            <linearGradient id="unused">
              <stop offset="0%" stop-color="blue"/>
            </linearGradient>
          </defs>
          <rect fill="url(#used)" />
        </svg>
      `;
      const result = await optimizeWithSvgo(svg);
      expect(result).toContain('id="used"');
      expect(result).not.toContain('id="unused"');
    });

    it('should remove redundant transforms', async () => {
      const svg = '<svg><g transform="translate(0,0) scale(1)"><rect /></g></svg>';
      const result = await optimizeWithSvgo(svg);
      expect(result).not.toContain('transform=');
    });

    it('should optimize numeric attributes', async () => {
      const svg = '<svg><rect x="10.000" y="20.500" width="30.123456" /></svg>';
      const result = await optimizeWithSvgo(svg);
      expect(result).toContain('x="10"');
      expect(result).toContain('y="20.5"');
      expect(result).toContain('width="30.12"');
    });
  });

  describe('basicCleanup', () => {
    it('should remove XML comments', () => {
      const svg = '<svg><!-- This is a comment --><rect /></svg>';
      const result = basicCleanup(svg);
      expect(result).not.toContain('<!-- This is a comment -->');
      expect(result).toContain('<rect />');
    });

    it('should remove unnecessary whitespace between tags', () => {
      const svg = '<svg>   <rect />   <circle />   </svg>';
      const result = basicCleanup(svg);
      expect(result).toBe('<svg><rect /><circle /></svg>');
    });

    it('should remove empty groups', () => {
      const svg = '<svg><g></g><g id="test"></g><rect /></svg>';
      const result = basicCleanup(svg);
      expect(result).not.toContain('<g></g>');
      expect(result).toContain('<rect />');
    });

    it('should clean up attribute spacing', () => {
      const svg = '<svg width = "100" height= "200" ><rect /></svg>';
      const result = basicCleanup(svg);
      expect(result).toContain('width="100"');
      expect(result).toContain('height="200"');
    });

    it('should simplify decimal numbers', () => {
      const svg = '<svg><rect x="10.123456" y="20.789012" /></svg>';
      const result = basicCleanup(svg);
      expect(result).toContain('x="10.12"');
      expect(result).toContain('y="20.79"');
    });

    it('should handle empty input gracefully', () => {
      expect(basicCleanup('')).toBe('');
      expect(basicCleanup('   ')).toBe('');
    });

    it('should return original content on error', () => {
      const invalidSvg = '<svg><invalid-regex-test';
      const result = basicCleanup(invalidSvg);
      expect(result).toBe(invalidSvg);
    });
  });

  describe('validateSvg', () => {
    it('should validate correct SVG', () => {
      const validSvg = '<svg><rect /></svg>';
      const result = validateSvg(validSvg);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing opening tag', () => {
      const invalidSvg = '<rect /></svg>';
      const result = validateSvg(invalidSvg);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing <svg> opening tag');
    });

    it('should detect missing closing tag', () => {
      const invalidSvg = '<svg><rect />';
      const result = validateSvg(invalidSvg);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing </svg> closing tag');
    });

    it('should handle empty content', () => {
      const result = validateSvg('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty SVG content');
    });
  });

  describe('extractSvgMetadata', () => {
    it('should extract viewBox information', () => {
      const svg = '<svg viewBox="0 0 100 200"><rect /></svg>';
      const metadata = extractSvgMetadata(svg);
      expect(metadata.viewBox).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    });

    it('should extract dimensions', () => {
      const svg = '<svg width="300" height="400"><rect /></svg>';
      const metadata = extractSvgMetadata(svg);
      expect(metadata.width).toBe('300');
      expect(metadata.height).toBe('400');
    });

    it('should count element types', () => {
      const svg = '<svg><rect /><circle /><path d="M0,0" /><g><rect /></g></svg>';
      const metadata = extractSvgMetadata(svg);
      expect(metadata.rectCount).toBe(2);
      expect(metadata.circleCount).toBe(1);
      expect(metadata.pathCount).toBe(1);
      expect(metadata.gCount).toBe(1);
    });

    it('should detect animations', () => {
      const svgWithAnimation = '<svg><animate attributeName="opacity" /></svg>';
      const svgWithoutAnimation = '<svg><rect /></svg>';
      
      expect(extractSvgMetadata(svgWithAnimation).hasAnimations).toBe(true);
      expect(extractSvgMetadata(svgWithoutAnimation).hasAnimations).toBe(false);
    });

    it('should detect gradients and patterns', () => {
      const svgWithGradient = '<svg><defs><linearGradient /></defs></svg>';
      const svgWithPattern = '<svg><defs><pattern /></defs></svg>';
      
      expect(extractSvgMetadata(svgWithGradient).hasGradients).toBe(true);
      expect(extractSvgMetadata(svgWithPattern).hasPatterns).toBe(true);
    });

    it('should calculate complexity score', () => {
      const simpleSvg = '<svg><rect /></svg>';
      const complexSvg = '<svg><g><rect /><circle /><path /></g><animate /></svg>';
      
      const simpleMetadata = extractSvgMetadata(simpleSvg);
      const complexMetadata = extractSvgMetadata(complexSvg);
      
      expect(complexMetadata.complexityScore).toBeGreaterThan(simpleMetadata.complexityScore);
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should suggest optimization for large files', () => {
      const largeSvg = '<svg>' + 'x'.repeat(60000) + '</svg>';
      const suggestions = generateOptimizationSuggestions(largeSvg);
      expect(suggestions).toContain('Large file size - consider optimizing path data');
    });

    it('should detect inline styles', () => {
      const svgWithStyles = '<svg><rect style="fill: red;" /></svg>';
      const suggestions = generateOptimizationSuggestions(svgWithStyles);
      expect(suggestions).toContain('Inline styles detected - consider moving to CSS classes');
    });

    it('should detect high precision numbers', () => {
      const svgWithPrecision = '<svg><rect x="1.123456" y="2.789012" width="3.456789" height="4.567890" z="5.678901" a="6.789012" /></svg>';
      const suggestions = generateOptimizationSuggestions(svgWithPrecision);
      expect(suggestions).toContain('High precision numbers detected - consider rounding for smaller file size');
    });

    it('should detect empty groups', () => {
      const svgWithEmptyGroups = '<svg><g></g><g> </g><rect /></svg>';
      const suggestions = generateOptimizationSuggestions(svgWithEmptyGroups);
      expect(suggestions.some(s => s.includes('empty groups can be removed'))).toBe(true);
    });

    it('should detect redundant transforms', () => {
      const svgWithRedundantTransforms = '<svg><g transform="translate(0,0)"><rect /></g></svg>';
      const suggestions = generateOptimizationSuggestions(svgWithRedundantTransforms);
      expect(suggestions).toContain('Redundant transforms detected');
    });

    it('should return empty array for clean SVG', () => {
      const cleanSvg = '<svg><rect x="10" y="20" /></svg>';
      const suggestions = generateOptimizationSuggestions(cleanSvg);
      expect(suggestions).toHaveLength(0);
    });
  });
});