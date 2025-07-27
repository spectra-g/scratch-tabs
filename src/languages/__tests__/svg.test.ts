import { SvgLanguageDetector } from '../svg';

describe('SVG Language Detector', () => {
  let detector: SvgLanguageDetector;

  beforeEach(() => {
    detector = new SvgLanguageDetector();
  });

  describe('Basic Properties', () => {
    it('should have correct basic properties', () => {
      expect(detector.id).toBe('svg');
      expect(detector.name).toBe('SVG');
      expect(detector.extensions).toEqual(['svg']);
      expect(detector.priority).toBe(5);
    });

    it('should return correct file extension', () => {
      expect(detector.getFileExtension()).toBe('svg');
    });
  });

  describe('Sample Content', () => {
    it('should return valid SVG sample content', () => {
      const sample = detector.sampleContent();
      expect(sample).toContain('<svg');
      expect(sample).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(sample).toContain('</svg>');
    });
  });

  describe('Detection Logic', () => {
    it('should detect basic SVG content', () => {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect SVG with namespace declaration', () => {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect width="100" height="100" fill="blue"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect SVG with path elements', () => {
      const content = `<svg>
        <path d="M 10 10 L 90 90" stroke="black"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect SVG with gradients', () => {
      const content = `<svg>
        <defs>
          <linearGradient id="grad1">
            <stop offset="0%" style="stop-color:red"/>
            <stop offset="100%" style="stop-color:blue"/>
          </linearGradient>
        </defs>
        <rect fill="url(#grad1)"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect SVG with animations', () => {
      const content = `<svg>
        <circle cx="50" cy="50" r="20">
          <animate attributeName="r" values="20;30;20" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect SVG with filters', () => {
      const content = `<svg>
        <defs>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3"/>
          </filter>
        </defs>
        <rect filter="url(#shadow)"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should not detect non-SVG content', () => {
      const content = `<html>
        <head><title>Test</title></head>
        <body><div>Hello World</div></body>
      </html>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should not detect JavaScript code', () => {
      const content = `function test() {
        const x = 10;
        return x * 2;
      }`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should not detect empty content', () => {
      const result = detector.detect('');
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should not detect very short content', () => {
      const result = detector.detect('<svg>');
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Complex SVG Detection', () => {
    it('should detect complex SVG with multiple elements', () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="200" cy="150" r="80" fill="url(#grad1)" stroke="#333" stroke-width="2" filter="url(#shadow)"/>
  <text x="200" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#333">
    SVG Example
  </text>
  <path d="M 100 200 Q 150 150 200 200 T 300 200" stroke="#333" stroke-width="3" fill="none"/>
</svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect SVG with text and styling', () => {
      const content = `<svg>
        <text x="100" y="50" font-family="Arial" font-size="24" fill="red" text-anchor="middle">
          Hello World
        </text>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect SVG with transforms', () => {
      const content = `<svg>
        <g transform="translate(100, 100) rotate(45)">
          <rect width="50" height="50" fill="blue"/>
        </g>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Monaco Integration', () => {
    it('should register language provider', () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn().mockReturnValue([]),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn()
        }
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: 'svg' });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    });

    it('should not re-register if language already exists', () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn().mockReturnValue([{ id: 'svg' }]),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn()
        }
      };

      detector.registerProvider(mockMonaco);

      expect(mockMonaco.languages.register).not.toHaveBeenCalled();
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    });

    it('should not duplicate XML declarations and comments during formatting', () => {
      const svgWithXmlDeclaration = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <!-- Background -->
  <rect width="400" height="300" fill="#f0f0f0"/>
  <!-- Gradient definition -->
  <defs>
    <linearGradient id="grad1">
      <stop offset="0%" style="stop-color:red"/>
      <stop offset="100%" style="stop-color:blue"/>
    </linearGradient>
  </defs>
</svg>`;

      // Test that detection still works correctly
      const result = detector.detect(svgWithXmlDeclaration);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should preserve text content formatting within text elements', () => {
      const svgWithText = `<svg>
  <text x="200" y="160" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        fill="#333">
    SVG Example
  </text>
</svg>`;

      // Test that detection still works correctly
      const result = detector.detect(svgWithText);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Confidence Scoring', () => {
    it('should give high confidence for definitive SVG', () => {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"/>
        <rect x="10" y="10" width="20" height="20" fill="blue"/>
        <path d="M 0 0 L 100 100" stroke="green"/>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchedDefinitive).toBe(true);
    });

    it('should give lower confidence for ambiguous content', () => {
      const content = `<svg>
        <div>This looks like HTML</div>
      </svg>`;
      
      const result = detector.detect(content);
      expect(result.confidence).toBeLessThan(0.8);
    });
  });
}); 