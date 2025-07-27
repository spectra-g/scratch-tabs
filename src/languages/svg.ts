import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * SVG language detector
 */
export class SvgLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "svg";
  name = "SVG";
  extensions = ["svg"];
  priority = 5; // Higher priority than XML since SVG is more specific

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
    ];

    // If no strong SVG signals were found initially, apply anti-patterns more aggressively
    if (confidenceScore < 0.4) {
      for (const ap of antiPatterns) {
        if (ap.pattern.test(content)) {
          confidenceScore += ap.weight;
        }
      }
    }

    // 10. Final Adjustments and Clamping
    if (strongSignalFound && patternsMatched >= 2) {
      confidenceScore += 0.1;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch =
      (strongSignalFound && confidenceScore >= 0.3) ||
      (patternsMatched >= 2 && confidenceScore >= 0.4);

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
    const languageId = this.id;

    // Register the language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // Define SVG syntax highlighting
    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: '',
      tokenPostfix: '.svg',

      // SVG keywords
      keywords: [
        'svg', 'circle', 'rect', 'path', 'line', 'polyline', 'polygon', 'ellipse',
        'text', 'tspan', 'g', 'defs', 'use', 'symbol', 'pattern', 'filter',
        'linearGradient', 'radialGradient', 'stop', 'animate', 'animateTransform',
        'animateMotion', 'feGaussianBlur', 'feDropShadow', 'feOffset', 'feMerge',
        'feMergeNode', 'feColorMatrix', 'feComponentTransfer', 'feFuncR', 'feFuncG',
        'feFuncB', 'feFuncA', 'feBlend', 'feComposite', 'feConvolveMatrix',
        'feDiffuseLighting', 'feDisplacementMap', 'feFlood', 'feImage', 'feMorphology',
        'feSpecularLighting', 'feTile', 'feTurbulence', 'feDistantLight', 'fePointLight',
        'feSpotLight', 'metadata', 'title', 'desc'
      ],

      // SVG attributes
      attributes: [
        'viewBox', 'preserveAspectRatio', 'd', 'points', 'cx', 'cy', 'r',
        'x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width',
        'text-anchor', 'font-family', 'font-size', 'transform', 'filter',
        'gradientUnits', 'spreadMethod', 'xlink:href', 'opacity', 'fill-opacity',
        'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
        'stroke-dashoffset', 'fill-rule', 'clip-path', 'mask', 'marker',
        'marker-start', 'marker-mid', 'marker-end', 'vector-effect', 'pathLength',
        'startOffset', 'textLength', 'lengthAdjust', 'dx', 'dy', 'rotate',
        'font-weight', 'font-style', 'font-variant', 'text-decoration',
        'letter-spacing', 'word-spacing', 'textLength', 'lengthAdjust'
      ],

      // XML keywords
      xmlKeywords: [
        'xml', 'version', 'encoding', 'standalone'
      ],

      // The main tokenizer for our languages
      tokenizer: {
        root: [
          // XML declaration
          [/<\?xml/, 'metatag', '@xmlDecl'],
          
          // Comments
          [/<!--/, 'comment', '@comment'],
          
          // DOCTYPE
          [/<!DOCTYPE/, 'metatag', '@doctype'],
          
          // CDATA
          [/<!\[CDATA\[/, 'metatag', '@cdata'],
          
          // Processing instructions
          [/<\?[^?]*\?>/, 'metatag'],
          
          // Tags
          [/<(\w+)/, 'tag', '@tag'],
          [/<\/(\w+)/, 'tag'],
          
          // Self-closing tags
          [/<(\w+)([^>]*)\/>/, 'tag'],
          
          // Attributes
          [/"([^"]*)"/, 'string'],
          [/'([^']*)'/, 'string'],
          [/[\w\-]+(?=\s*=)/, 'attribute'],
          
          // Numbers
          [/\d+\.?\d*/, 'number'],
          
          // Whitespace
          [/\s+/, 'white']
        ],

        xmlDecl: [
          [/[^?>]+/, 'metatag'],
          [/\?>/, 'metatag', '@pop']
        ],

        comment: [
          [/[^<\-]+/, 'comment'],
          [/-->/, 'comment', '@pop'],
          [/<!--/, 'comment']
        ],

        doctype: [
          [/[^>]+/, 'metatag'],
          [/>/, 'metatag', '@pop']
        ],

        cdata: [
          [/[^\]]+/, 'metatag'],
          [/\]>/, 'metatag', '@pop']
        ],

        tag: [
          [/[^\/\s>]+/, 'tag'],
          [/>/, 'tag', '@pop'],
          [/\//, 'tag'],
          [/\s+/, 'white']
        ]
      }
    });

    // Register document formatting provider
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any, options: any) {
        const content = model.getValue();
        const indentChar = options.insertSpaces ? " ".repeat(options.tabSize) : "\t";
        
        let formattedSvg = "";
        let indentLevel = 0;
        let currentLine = '';
        
        // Split content into tokens while preserving structure
        const tokens = this.tokenizeSvg(content);
        
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          
          // Always start a new line for these token types
          const shouldStartNewLine = [
            'openTag', 'closeTag', 'selfClosingTag', 
            'comment', 'cdata', 'processingInstruction'
          ].includes(token.type);
          
          if (shouldStartNewLine) {
            if (currentLine.trim()) {
              formattedSvg += currentLine + '\n';
              currentLine = '';
            }
            currentLine = indentChar.repeat(indentLevel) + token.value;
          } else if (token.type === 'text') {
            // Handle text content
            if (token.value.trim()) {
              if (currentLine.trim()) {
                formattedSvg += currentLine + '\n';
                currentLine = '';
              }
              currentLine = indentChar.repeat(indentLevel) + token.value;
            }
          } else {
            // Handle other token types (attributes, strings, etc.)
            currentLine += token.value;
          }
          
          // Check if we need to increase indent level
          if (token.type === 'openTag' && !token.value.includes('/>')) {
            indentLevel++;
          } else if (token.type === 'closeTag') {
            indentLevel = Math.max(0, indentLevel - 1);
          }
        }
        
        // Add any remaining content
        if (currentLine.trim()) {
          formattedSvg += currentLine;
        }
        
        // Ensure proper line endings
        formattedSvg = formattedSvg.trim();
        if (content.trim().length > 0 && content.endsWith('\n')) {
          formattedSvg += '\n';
        }
        
        return [{
          range: model.getFullModelRange(),
          text: formattedSvg
        }];
      },
      
      // Helper method to tokenize SVG content
      tokenizeSvg(content: string) {
        const tokens: Array<{type: string, value: string}> = [];
        
        // More specific regex patterns to avoid overlaps
        const commentRegex = /<!--[\s\S]*?-->/g;
        const cdataRegex = /<!\[CDATA\[[\s\S]*?\]\]>/g;
        const piRegex = /<\?[^>]*\?>/g;
        const tagRegex = /<(\/?)([^>]+)>/g;
        
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        
        // Find all tags and special elements
        const allMatches: Array<{index: number, type: string, value: string}> = [];
        
        // Find comments first (highest priority)
        while ((match = commentRegex.exec(content)) !== null) {
          allMatches.push({
            index: match.index,
            type: 'comment',
            value: match[0]
          });
        }
        
        // Find CDATA
        while ((match = cdataRegex.exec(content)) !== null) {
          allMatches.push({
            index: match.index,
            type: 'cdata',
            value: match[0]
          });
        }
        
        // Find processing instructions (XML declarations, etc.)
        while ((match = piRegex.exec(content)) !== null) {
          allMatches.push({
            index: match.index,
            type: 'processingInstruction',
            value: match[0]
          });
        }
        
        // Find tags (excluding processing instructions and comments)
        while ((match = tagRegex.exec(content)) !== null) {
          const tagContent = match[0];
          
          // Skip if this is already matched as a processing instruction or comment
          const isAlreadyMatched = allMatches.some(m => 
            m.index <= match!.index && 
            m.index + m.value.length > match!.index
          );
          
          if (!isAlreadyMatched) {
            const isClosing = match[1] === '/';
            const tagName = match[2];
            const isSelfClosing = tagName.endsWith('/');
            
            let type = 'openTag';
            if (isClosing) {
              type = 'closeTag';
            } else if (isSelfClosing) {
              type = 'selfClosingTag';
            }
            
            allMatches.push({
              index: match.index,
              type,
              value: match[0]
            });
          }
        }
        
        // Sort matches by index
        allMatches.sort((a, b) => a.index - b.index);
        
        // Process matches and extract text
        for (const match of allMatches) {
          // Add text before this match
          if (match.index > lastIndex) {
            const text = content.substring(lastIndex, match.index);
            // Preserve whitespace, including blank lines
            if (text) {
              tokens.push({ type: 'text', value: text });
            }
          }
          
          // Add the match
          tokens.push({ type: match.type, value: match.value });
          lastIndex = match.index + match.value.length;
        }
        
        // Add remaining text
        if (lastIndex < content.length) {
          const text = content.substring(lastIndex);
          if (text) {
            tokens.push({ type: 'text', value: text });
          }
        }
        
        return tokens;
      }
    });
  }
}

// Create and register the detector
const svgDetector = new SvgLanguageDetector();
languageRegistry.register(svgDetector);

// Export for backward compatibility (optional)
export const registerSvgProvider = (monaco: any) => {
  svgDetector.registerProvider(monaco);
}; 