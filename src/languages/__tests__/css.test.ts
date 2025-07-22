import { CssLanguageDetector } from "../css";

describe("CssLanguageDetector", () => {
  let detector: CssLanguageDetector;

  beforeEach(() => {
    detector = new CssLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("css");
      expect(detector.name).toBe("CSS");
      expect(detector.extensions).toEqual(["css", "scss", "less"]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("css");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid CSS sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("body {");
      expect(sample).toContain("font-family:");
      expect(sample).toContain(".header {");
      expect(sample).toContain("#main-nav");
      expect(sample).toContain("a:hover");
    });
  });

  describe("Detection Logic", () => {
    test("should detect CSS with selectors and properties", () => {
      const cssCode = `.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

#header {
  background-color: #333;
  color: white;
}

h1, h2, h3 {
  font-family: Arial, sans-serif;
  margin-bottom: 1em;
}`;
      const result = detector.detect(cssCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect CSS with pseudo-classes", () => {
      const pseudoClassCSS = `a:link {
  color: blue;
  text-decoration: none;
}

a:visited {
  color: purple;
}

a:hover {
  color: red;
  text-decoration: underline;
}

a:active {
  color: yellow;
}

button:focus {
  outline: 2px solid blue;
}`;
      const result = detector.detect(pseudoClassCSS);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect CSS with media queries", () => {
      const mediaQueryCSS = `@media screen and (max-width: 768px) {
  .container {
    width: 95%;
    padding: 10px;
  }
  
  .navigation {
    flex-direction: column;
  }
}

@media print {
  .no-print {
    display: none;
  }
}`;
      const result = detector.detect(mediaQueryCSS);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect CSS with animations", () => {
      const animationCSS = `@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-animation {
  animation: slideIn 0.5s ease-in-out;
  transition: all 0.3s ease;
}`;
      const result = detector.detect(animationCSS);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect CSS flexbox and grid", () => {
      const layoutCSS = `.flex-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
  grid-template-areas: 
    "header header header"
    "sidebar content content"
    "footer footer footer";
}`;
      const result = detector.detect(layoutCSS);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect SCSS syntax", () => {
      const scssCode = `$primary-color: #333;
$secondary-color: #777;

.navigation {
  background-color: $primary-color;
  
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    
    li {
      display: inline-block;
      
      a {
        color: white;
        text-decoration: none;
        
        &:hover {
          color: $secondary-color;
        }
      }
    }
  }
}`;
      const result = detector.detect(scssCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should reject HTML content", () => {
      const htmlContent = `<div class="container">
  <h1>Hello World</h1>
  <p>This is a paragraph.</p>
  <button onclick="alert('clicked')">Click me</button>
</div>`;
      const result = detector.detect(htmlContent);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `const container = document.querySelector('.container');
container.style.backgroundColor = 'red';

function updateStyles() {
  const elements = document.querySelectorAll('.item');
  elements.forEach(el => {
    el.classList.add('active');
  });
}`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "colors": {
    "primary": "#333",
    "secondary": "#777"
  },
  "fonts": {
    "body": "Arial, sans-serif",
    "heading": "Georgia, serif"
  }
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("color").match).toBe(false);
    });

    test("should detect CSS custom properties", () => {
      const customPropsCSS = `:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --font-size-base: 1rem;
  --border-radius: 4px;
}

.button {
  background-color: var(--primary-color);
  color: white;
  font-size: var(--font-size-base);
  border-radius: var(--border-radius);
  border: none;
  padding: 0.5rem 1rem;
}`;
      const result = detector.detect(customPropsCSS);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});