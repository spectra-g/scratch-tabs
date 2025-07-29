
import { HtmlFormatDetector } from "../html";

describe("HtmlFormatDetector", () => {
  let detector: HtmlFormatDetector;

  beforeEach(() => {
    detector = new HtmlFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("html");
      expect(detector.name).toBe("HTML");
      expect(detector.extensions).toEqual(["html", "htm", "xhtml"]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("html");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid HTML sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("<!DOCTYPE html>");
      expect(sample).toContain("<html");
      expect(sample).toContain("<head>");
      expect(sample).toContain("<body>");
      expect(sample).toContain("</html>");
    });
  });

  describe("Detection", () => {
    test("should detect valid HTML with DOCTYPE", () => {
      const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect HTML with common tags", () => {
      const content = `<html>
<body>
  <div class="container">
    <h1>Title</h1>
    <p>Paragraph with <a href="#">link</a></p>
    <img src="test.jpg" alt="Test">
  </div>
</body>
</html>`;
      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject non-HTML content", () => {
      const content = `function test() {
  console.log("This is JavaScript");
  return true;
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });


  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({
        id: "html",
      });
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalledWith("html", expect.any(Object));
    });
  });
});
