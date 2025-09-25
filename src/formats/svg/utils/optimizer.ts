/**
 * SVG Optimization utilities for the SVG Smart View
 * Provides both advanced SVGO optimization and basic cleanup fallback
 */

/**
 * Advanced SVG optimization using browser-compatible techniques
 * Falls back to basic cleanup if advanced optimization fails
 */
export const optimizeWithSvgo = async (svgContent: string): Promise<string> => {
  if (!svgContent?.trim()) {
    return '';
  }
  
  try {
    return advancedCleanup(svgContent);
  } catch (error) {
    return basicCleanup(svgContent);
  }
};

/**
 * Advanced SVG cleanup using DOM parsing and comprehensive optimizations
 * This provides SVGO-like functionality but is fully browser-compatible
 */
const advancedCleanup = (svgContent: string): string => {
  if (!svgContent || !svgContent.trim()) {
    return '';
  }

  let optimized = svgContent;

  try {
    // Create a temporary DOM element to work with the SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(optimized, 'image/svg+xml');
    const svg = doc.documentElement;

    if (svg.nodeName !== 'svg') {
      throw new Error('Invalid SVG document');
    }

    // 1. Remove XML comments
    removeComments(svg);

    // 2. Clean up attributes
    cleanupAttributes(svg);

    // 3. Remove empty elements and groups
    removeEmptyElements(svg);

    // 4. Optimize numeric values
    optimizeNumericValues(svg);

    // 5. Remove unused definitions
    removeUnusedDefinitions(svg);

    // 6. Merge similar paths (basic implementation)
    mergeSimilarPaths(svg);

    // 7. Optimize transforms
    optimizeTransforms(svg);

    // Serialize back to string
    optimized = new XMLSerializer().serializeToString(svg);

    // 8. Final string-based cleanup
    optimized = finalStringCleanup(optimized);

    return optimized;

  } catch (error) {
    return basicCleanup(svgContent);
  }
};

const removeComments = (element: Element): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_COMMENT,
    null
  );

  const comments: Comment[] = [];
  let node: Comment | null;
  while (node = walker.nextNode() as Comment | null) {
    comments.push(node);
  }

  comments.forEach(comment => comment.remove());
};

const cleanupAttributes = (element: Element): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Element | null;
  while (node = walker.nextNode() as Element | null) {
    // Remove empty attributes
    Array.from(node.attributes).forEach(attr => {
      if (!attr.value.trim()) {
        node!.removeAttribute(attr.name);
      }
    });

    // Clean up style attributes
    if (node.hasAttribute('style')) {
      const style = node.getAttribute('style')!;
      const cleanStyle = style
        .split(';')
        .filter(rule => rule.trim())
        .map(rule => rule.trim())
        .join(';');
      
      if (cleanStyle) {
        node.setAttribute('style', cleanStyle);
      } else {
        node.removeAttribute('style');
      }
    }
  }
};

const removeEmptyElements = (element: Element): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const elementsToRemove: Element[] = [];
  let node: Element | null;
  
  while (node = walker.nextNode() as Element | null) {
    // Remove empty groups and containers
    if (['g', 'defs', 'clipPath', 'mask'].includes(node.tagName.toLowerCase())) {
      if (!node.hasChildNodes() && !node.hasAttributes()) {
        elementsToRemove.push(node);
      }
    }
  }

  elementsToRemove.forEach(el => el.remove());
};

const optimizeNumericValues = (element: Element): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Element | null;
  while (node = walker.nextNode() as Element | null) {
    Array.from(node.attributes).forEach(attr => {
      // Optimize numeric attributes
      if (['x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'stroke-width'].includes(attr.name)) {
        const value = parseFloat(attr.value);
        if (!isNaN(value)) {
          node!.setAttribute(attr.name, value.toFixed(2).replace(/\.?0+$/, ''));
        }
      }
      
      // Optimize path data
      if (attr.name === 'd') {
        node!.setAttribute('d', optimizePathData(attr.value));
      }
      
      // Optimize viewBox
      if (attr.name === 'viewBox') {
        const values = attr.value.split(/\s+/).map(v => {
          const num = parseFloat(v);
          return isNaN(num) ? v : num.toFixed(2).replace(/\.?0+$/, '');
        });
        node!.setAttribute('viewBox', values.join(' '));
      }
    });
  }
};

const optimizePathData = (pathData: string): string => {
  if (!pathData?.trim()) {
    return pathData;
  }
  
  return pathData
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*([MLHVCSQTAZ])\s*/gi, '$1')
    .replace(/(\d+\.\d{3,})/g, (match) => {
      const num = parseFloat(match);
      return isNaN(num) ? match : num.toFixed(2).replace(/\.?0+$/, '');
    })
    .trim();
};

const removeUnusedDefinitions = (svg: Element): void => {
  const defs = svg.querySelector('defs');
  if (!defs) return;

  const usedIds = collectUsedIds(svg);
  const childrenToRemove: Element[] = [];

  // Collect unused definitions
  Array.from(defs.children).forEach(child => {
    const id = child.getAttribute('id');
    if (id && !usedIds.has(id)) {
      childrenToRemove.push(child);
    }
  });

  // Remove unused definitions
  childrenToRemove.forEach(child => child.remove());

  // Remove empty defs
  if (!defs.hasChildNodes()) {
    defs.remove();
  }
};

const collectUsedIds = (svg: Element): Set<string> => {
  const usedIds = new Set<string>();
  const svgContent = svg.outerHTML;

  const patterns = [
    /url\(#([^)]+)\)/g,
    /href=["']#([^"']+)["']/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(svgContent)) !== null) {
      usedIds.add(match[1]);
    }
  });

  return usedIds;
};

const mergeSimilarPaths = (svg: Element): void => {
  const paths = Array.from(svg.querySelectorAll('path'));
  const pathGroups = new Map<string, Element[]>();

  // Group paths by similar attributes (fill, stroke, etc.)
  paths.forEach(path => {
    const key = ['fill', 'stroke', 'stroke-width', 'opacity']
      .map(attr => `${attr}:${path.getAttribute(attr) || 'none'}`)
      .join('|');
    
    if (!pathGroups.has(key)) {
      pathGroups.set(key, []);
    }
    pathGroups.get(key)!.push(path);
  });

  // Basic merging (could be enhanced further)
  pathGroups.forEach(group => {
    if (group.length > 1) {
      // For now, just ensure they're properly formatted
      // More sophisticated merging would require path parsing
      group.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
          path.setAttribute('d', optimizePathData(d));
        }
      });
    }
  });
};

const optimizeTransforms = (element: Element): void => {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Element | null;
  while (node = walker.nextNode() as Element | null) {
    const transform = node.getAttribute('transform');
    if (transform) {
      // Remove redundant transforms
      if (transform.includes('translate(0,0)') || 
          transform.includes('translate(0 0)') ||
          transform.includes('scale(1)') ||
          transform.includes('rotate(0)')) {
        
        const cleaned = transform
          .replace(/translate\(0[,\s]+0\)/g, '')
          .replace(/scale\(1\)/g, '')
          .replace(/rotate\(0\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleaned) {
          node.setAttribute('transform', cleaned);
        } else {
          node.removeAttribute('transform');
        }
      }
    }
  }
};

const finalStringCleanup = (svgString: string): string => {
  return svgString
    // Remove XML declaration if present (browsers don't need it)
    .replace(/<\?xml[^>]*>\s*/, '')
    // Clean up whitespace between tags
    .replace(/>\s+</g, '><')
    // Remove unnecessary namespace declarations (keep main ones)
    .replace(/\s+xmlns:[^=]+="[^"]*"/g, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Trim
    .trim();
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
    // Silently handle metadata extraction errors
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
    // Silently handle analysis errors
  }

  return suggestions;
};