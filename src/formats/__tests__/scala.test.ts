import { ScalaFormatDetector } from "../scala";

describe("ScalaFormatDetector", () => {
  let detector: ScalaFormatDetector;

  beforeEach(() => {
    detector = new ScalaFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("scala");
      expect(detector.name).toBe("Scala");
      expect(detector.extensions).toEqual(["scala", "sc"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("scala");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Scala object", () => {
      const scalaCode = `object HelloWorld {
  def main(args: Array[String]): Unit = {
    println("Hello, World!")
  }
}`;
      const result = detector.detect(scalaCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect Scala class", () => {
      const scalaClass = `class Person(val name: String, val age: Int) {
  def greet(): String = s"Hello, my name is $name"
  
  def isAdult: Boolean = age >= 18
}`;
      const result = detector.detect(scalaClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should handle empty content", () => {
      expect(detector.detect("").match).toBe(false);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});