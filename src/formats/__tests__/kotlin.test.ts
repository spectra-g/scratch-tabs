import { KotlinFormatDetector } from "../kotlin";

describe("KotlinFormatDetector", () => {
  let detector: KotlinFormatDetector;

  beforeEach(() => {
    detector = new KotlinFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("kotlin");
      expect(detector.name).toBe("Kotlin");
      expect(detector.extensions).toEqual(["kt", "kts"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("kt");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid Kotlin sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("fun main");
      expect(sample).toContain("class ");
      expect(sample).toContain("val ");
      expect(sample).toContain("println");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Kotlin main function", () => {
      const kotlinCode = `fun main() {
    val name = "World"
    println("Hello, $name!")
}`;
      const result = detector.detect(kotlinCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect Kotlin class", () => {
      const kotlinClass = `class User(val name: String, val email: String) {
    fun greet(): String {
        return "Hello, my name is $name"
    }
    
    fun getDisplayName(): String = name.uppercase()
}`;
      const result = detector.detect(kotlinClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect Kotlin data class", () => {
      const kotlinData = `data class Person(
    val firstName: String,
    val lastName: String,
    val age: Int
)

fun main() {
    val person = Person("John", "Doe", 30)
    println(person.copy(age = 31))
}`;
      const result = detector.detect(kotlinData);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should reject Java code", () => {
      const javaCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`;
      const result = detector.detect(javaCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("fun").match).toBe(false);
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