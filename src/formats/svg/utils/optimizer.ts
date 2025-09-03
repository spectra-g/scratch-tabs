/**
 * SVG Optimization utilities for the SVG Smart View
 * Provides both advanced SVGO optimization and basic cleanup fallback
 */

// SVGO optimization using Web Worker to avoid blocking the UI
export const optimizeWithSvgo = async (svgContent: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create a Web Worker for SVGO optimization
    const workerCode = `
      // Import SVGO from CDN in the worker
      importScripts('https://cdn.skypack.dev/svgo@3.0.2');
      
      self.onmessage = function(e) {
        const { svgContent } = e.data;
        
        try {
          // Configure SVGO with safe, performance-focused optimizations
          const svgo = new SVGO({
            plugins: [
              'preset-default',
              {
                name: 'removeViewBox',
                active: false, // Keep viewBox for responsiveness
              },
              {
                name: 'removeDimensions',
                active: true, // Remove width/height if viewBox exists
              },
              {
                name: 'cleanupIds',
                active: true,
              },
              {
                name: 'removeUnusedNS',
                active: true,
              },
              {
                name: 'removeEmptyContainers',
                active: true,
              },
              {
                name: 'mergeStyles',
                active: true,
              },
              {
                name: 'removeUnknownAndDefaults',
                active: true,
              },
              {
                name: 'cleanupNumericValues',
                active: true,
                params: {
                  floatPrecision: 2,
                },
              },
            ],
          });
          
          const result = svgo.optimize(svgContent);
          
          self.postMessage({
            success: true,
            data: result.data,
            info: result.info || {},
          });
        } catch (error) {
          self.postMessage({
            success: false,
            error: error.message || 'SVGO optimization failed',
          });
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      // Set up worker timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(new Error('SVGO optimization timed out'));
      }, 30000); // 30 second timeout

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        const { success, data, error } = e.data;
        if (success) {
          resolve(data);
        } else {
          reject(new Error(error || 'SVGO optimization failed'));
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send SVG content to worker
      worker.postMessage({ svgContent });

    } catch (error) {
      reject(new Error(`Failed to create optimization worker: ${error}`));
    }
  });
};

/**
 * Basic SVG cleanup using only regular expressions
 * This is the fallback when SVGO is not available or fails
 * 
 * Limitations compared to SVGO:
 * - Cannot optimize path data (d attributes)
 * - Cannot merge similar elements
 * - Cannot perform advanced geometric optimizations
 * - Cannot optimize gradients and patterns
 * - Limited numeric precision optimization
 */
export const basicCleanup = (svgContent: string): string => {
  if (!svgContent || !svgContent.trim()) {
    return '';
  }

  let cleaned = svgContent;

  try {
    // 1. Remove XML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Remove unnecessary whitespace between tags
    cleaned = cleaned.replace(/>\s+</g, '><');

    // 3. Remove empty groups and containers
    cleaned = cleaned.replace(/<g[^>]*>\s*<\/g>/g, '');
    cleaned = cleaned.replace(/<defs[^>]*>\s*<\/defs>/g, '');
    cleaned = cleaned.replace(/<clipPath[^>]*>\s*<\/clipPath>/g, '');

    // 4. Clean up attribute spacing
    cleaned = cleaned.replace(/\s+=/g, '=');
    cleaned = cleaned.replace(/=\s+/g, '=');

    // 5. Remove redundant spaces in attribute values
    cleaned = cleaned.replace(/="\s+/g, '="');
    cleaned = cleaned.replace(/\s+"/g, '"');

    // 6. Remove empty attributes
    cleaned = cleaned.replace(/\s+\w+=""\s*/g, ' ');

    // 7. Simplify decimal numbers (basic precision reduction)
    cleaned = cleaned.replace(/(\d+\.\d{3,})/g, (match) => {
      const num = parseFloat(match);
      return num.toFixed(2);
    });

    // 8. Remove unnecessary xmlns declarations (keep main one)
    cleaned = cleaned.replace(/\s+xmlns:\w+="[^"]*"/g, '');

    // 9. Clean up multiple spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    // 10. Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;

  } catch (error) {
    console.error('[SVG Optimizer] Basic cleanup failed:', error);
    return svgContent; // Return original on error
  }
};

/**
 * Validates SVG content structure
 */
export const validateSvg = (content: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!content || !content.trim()) {
    errors.push('Empty SVG content');
    return { isValid: false, errors };
  }

  // Check for basic SVG structure
  if (!content.includes('<svg')) {
    errors.push('Missing <svg> opening tag');
  }

  if (!content.includes('</svg>')) {
    errors.push('Missing </svg> closing tag');
  }

  // Check for basic tag matching - simplified approach
  const svgTagMatch = content.match(/<svg[^>]*>/);
  const svgCloseMatch = content.match(/<\/svg>/);
  
  if (svgTagMatch && svgCloseMatch) {
    // Basic SVG structure is present - for this simple validation, we'll consider it valid
    // A full XML parser would be needed for comprehensive validation
  } else if (!svgTagMatch || !svgCloseMatch) {
    // This case is already handled above, but keeping for clarity
  }

  // Check for malformed attributes
  const malformedAttrs = content.match(/\w+=[^"'\s][^>\s]*/g);
  if (malformedAttrs) {
    errors.push('Unquoted attribute values detected');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Extracts metadata from SVG content
 */
export const extractSvgMetadata = (content: string) => {
  const metadata: { [key: string]: any } = {};

  try {
    // Extract viewBox
    const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/);
    if (viewBoxMatch) {
      const [x, y, width, height] = viewBoxMatch[1].split(/\s+/).map(Number);
      metadata.viewBox = { x, y, width, height };
    }

    // Extract dimensions
    const widthMatch = content.match(/width=["']([^"']+)["']/);
    const heightMatch = content.match(/height=["']([^"']+)["']/);
    if (widthMatch) metadata.width = widthMatch[1];
    if (heightMatch) metadata.height = heightMatch[1];

    // Count elements by type
    const elementTypes = ['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline', 'text', 'g', 'defs', 'use'];
    elementTypes.forEach(type => {
      const matches = content.match(new RegExp(`<${type}\\b`, 'g'));
      if (matches) {
        metadata[`${type}Count`] = matches.length;
      }
    });

    // Check for animations
    const hasAnimations = content.includes('<animate') || content.includes('<animateTransform');
    metadata.hasAnimations = hasAnimations;

    // Check for gradients and patterns
    const hasGradients = content.includes('<linearGradient') || content.includes('<radialGradient');
    const hasPatterns = content.includes('<pattern');
    metadata.hasGradients = hasGradients;
    metadata.hasPatterns = hasPatterns;

    // Estimate complexity score
    const totalElements = Object.keys(metadata)
      .filter(key => key.endsWith('Count'))
      .reduce((sum, key) => sum + (metadata[key] || 0), 0);
    
    metadata.complexityScore = totalElements + (hasAnimations ? 10 : 0) + (hasGradients ? 5 : 0);

  } catch (error) {
    console.warn('[SVG Metadata] Extraction failed:', error);
  }

  return metadata;
};

/**
 * Generates optimization suggestions based on SVG analysis
 */
export const generateOptimizationSuggestions = (content: string): string[] => {
  const suggestions: string[] = [];

  try {
    // Check file size
    const size = new Blob([content]).size;
    if (size > 50000) { // 50KB
      suggestions.push('Large file size - consider optimizing path data');
    }

    // Check for inline styles
    if (content.includes('style=')) {
      suggestions.push('Inline styles detected - consider moving to CSS classes');
    }

    // Check for unnecessary precision
    const highPrecisionNumbers = content.match(/\d+\.\d{4,}/g);
    if (highPrecisionNumbers && highPrecisionNumbers.length > 5) {
      suggestions.push('High precision numbers detected - consider rounding for smaller file size');
    }

    // Check for empty groups
    const emptyGroups = content.match(/<g[^>]*>\s*<\/g>/g);
    if (emptyGroups && emptyGroups.length > 0) {
      suggestions.push(`${emptyGroups.length} empty groups can be removed`);
    }

    // Check for redundant transforms
    if (content.includes('transform="translate(0,0)"') || content.includes('transform="scale(1)"')) {
      suggestions.push('Redundant transforms detected');
    }

    // Check for unused definitions
    const defsContent = content.match(/<defs[^>]*>([\s\S]*?)<\/defs>/);
    if (defsContent && defsContent[1]) {
      const defIds = (defsContent[1].match(/id=["']([^"']+)["']/g) || [])
        .map(match => match.match(/id=["']([^"']+)["']/)?.[1])
        .filter(Boolean);
      
      const unusedDefs = defIds.filter(id => {
        const usagePattern = new RegExp(`(url\\(#${id}\\)|href=["']#${id}["'])`, 'g');
        return !usagePattern.test(content);
      });

      if (unusedDefs.length > 0) {
        suggestions.push(`${unusedDefs.length} unused definitions can be removed`);
      }
    }

  } catch (error) {
    console.warn('[SVG Suggestions] Analysis failed:', error);
  }

  return suggestions;
};