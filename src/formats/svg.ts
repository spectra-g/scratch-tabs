import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * SVG language detector
 */
export class SvgFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "xml"; // Use Monaco's built-in XML language
  name = "SVG";
  extensions = ["svg"];
  priority = 3; // Higher priority than XML since SVG is more specific

  sampleContent(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="400" height="300" 
     viewBox="0 0 400 300">
  
  <!-- Background -->
  <rect width="400" height="300" fill="#f0f0f0"/>
  
  <!-- Gradient definition -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
    </linearGradient>
    
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Main circle -->
  <circle cx="200" cy="150" r="80" 
          fill="url(#grad1)" 
          stroke="#333" 
          stroke-width="2"
          filter="url(#shadow)"/>
  
  <!-- Text -->
  <text x="200" y="160" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        fill="#333">
    SVG Example
  </text>
  
  <!-- Animated element -->
  <rect x="50" y="50" width="60" height="40" 
        fill="#ff6b6b" 
        opacity="0.8">
    <animate attributeName="opacity" 
             values="0.8;0.3;0.8" 
             dur="2s" 
             repeatCount="indefinite"/>
  </rect>
  
  <!-- Path example -->
  <path d="M 100 200 Q 150 150 200 200 T 300 200" 
        stroke="#333" 
        stroke-width="3" 
        fill="none"/>
  
  <!-- Group with transform -->
  <g transform="translate(300, 100) rotate(45)">
    <rect width="40" height="40" fill="#4ecdc4"/>
    <circle cx="20" cy="20" r="8" fill="#fff"/>
  </g>
  
</svg>`;
  }

  /**
   * Detects if the given content matches SVG patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. SVG Root Element (Very Strong Signal)
    if (/<svg\s[^>]*>/i.test(trimmedContent)) {
      confidenceScore += 0.8;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2. SVG Namespace Declaration (Strong Signal)
    if (/xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(trimmedContent)) {
      confidenceScore += 0.6;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2b. Basic SVG root element without namespace (still strong signal)
    if (/<svg>/i.test(trimmedContent)) {
      confidenceScore += 0.7;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 3. Common SVG Elements
    const svgElements = [
      'circle', 'rect', 'path', 'line', 'polyline', 'polygon', 'ellipse',
      'text', 'tspan', 'g', 'defs', 'use', 'symbol', 'pattern', 'filter',
      'linearGradient', 'radialGradient', 'stop', 'animate', 'animateTransform',
      'feGaussianBlur', 'feDropShadow', 'feOffset', 'feMerge', 'feMergeNode'
    ];

    const elementMatches = svgElements.filter(element => 
      new RegExp(`<${element}\\s[^>]*>|<${element}\\s*/>`, 'i').test(trimmedContent)
    );

    if (elementMatches.length > 0) {
      confidenceScore += Math.min(elementMatches.length * 0.1, 0.4);
      patternsMatched++;
      if (elementMatches.length >= 3) strongSignalFound = true;
    }

    // 4. SVG-specific attributes
    const svgAttributes = [
      'viewBox', 'preserveAspectRatio', 'd=', 'points=', 'cx=', 'cy=', 'r=',
      'x=', 'y=', 'width=', 'height=', 'fill=', 'stroke=', 'stroke-width=',
      'text-anchor', 'font-family', 'font-size', 'transform=', 'filter=',
      'gradientUnits', 'spreadMethod', 'xlink:href'
    ];

    const attributeMatches = svgAttributes.filter(attr => 
      new RegExp(attr.replace('=', '\\s*='), 'i').test(trimmedContent)
    );

    if (attributeMatches.length > 0) {
      confidenceScore += Math.min(attributeMatches.length * 0.05, 0.3);
      patternsMatched++;
    }

    // 5. Path data (very specific to SVG)
    if (/d\s*=\s*["'][^"']*[MLHVCSQTAZmlhvcsqtaz][^"']*["']/i.test(trimmedContent)) {
      confidenceScore += 0.3;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 6. Gradient definitions
    if (/<defs>|<linearGradient|<radialGradient|<stop/i.test(trimmedContent)) {
      confidenceScore += 0.2;
      patternsMatched++;
    }

    // 7. Animation elements
    if (/<animate|<animateTransform|<animateMotion/i.test(trimmedContent)) {
      confidenceScore += 0.2;
      patternsMatched++;
    }

    // 8. Filter effects
    if (/<filter|<fe[A-Z][a-zA-Z]*/i.test(trimmedContent)) {
      confidenceScore += 0.2;
      patternsMatched++;
    }

    // 9. Anti-patterns (Reduce confidence if it looks more like other formats)
    const antiPatterns = [
      {
        pattern: /\b(function|class|var|let|const|def|if|for|while)\s*[\({]/gi,
        weight: -0.3,
      },
      { pattern: /=>|->/g, weight: -0.2 },
      { pattern: /^package\s|System\.out\.println|#include/gi, weight: -0.5 },
      { pattern: /\b(html|head|body|div|span|p)\b/gi, weight: -0.2 }, // HTML elements
      { pattern: /\b(import|export|require|module\.exports)\b/gi, weight: -0.3 }, // JavaScript/Node.js
      { pattern: /\b(public|private|protected|static|final|abstract)\b/gi, weight: -0.2 }, // Java/C#
      { pattern: /\b(def|class|end|do|if|else|elsif|unless|while|for|in)\b/gi, weight: -0.3 }, // Ruby
      { pattern: /\b(def|class|if|else|elif|for|while|try|except|import|from)\b/gi, weight: -0.3 }, // Python
      { pattern: /\b(fn|let|mut|struct|enum|impl|trait|use|mod)\b/gi, weight: -0.3 }, // Rust
      { pattern: /\b(func|var|const|type|struct|interface|package|import)\b/gi, weight: -0.3 }, // Go
    ];

    antiPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(trimmedContent)) {
        confidenceScore += weight;
      }
    });

    // 10. Final confidence calculation
    confidenceScore = Math.max(0.0, Math.min(1.0, confidenceScore));

    // Determine if this is a match
    const isMatch = strongSignalFound && confidenceScore >= 0.4;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "svg";
  }

  registerProvider(monaco: any): void {
    // SVG uses Monaco's built-in XML language, so no additional provider registration is needed
    // The XML language provider is already available in Monaco
  }

  // No registerProvider needed - using Monaco's built-in XML language
}

// Create and register the detector
const svgDetector = new SvgFormatDetector();
formatRegistry.register(svgDetector);

// No need for registerSvgProvider - using Monaco's built-in XML language 