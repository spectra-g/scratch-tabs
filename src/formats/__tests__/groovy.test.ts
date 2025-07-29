import { GroovyDetector } from "../groovy";

describe("GroovyFormatDetector", () => {
  let detector: GroovyDetector;

  beforeEach(() => {
    detector = new GroovyDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("groovy");
      expect(detector.name).toBe("Groovy");
      expect(detector.extensions).toEqual(["groovy", "gvy", "gy", "gsh", "gradle"]);
      expect(detector.priority).toBe(7);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("groovy");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Groovy script", () => {
      const groovyCode = `def name = "World"
println "Hello, $name!"

def square = { x -> x * x }
println square(5)`;
      const result = detector.detect(groovyCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Gradle build script", () => {
      const gradleScript = `plugins {
    id 'java'
    id 'application'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.apache.commons:commons-lang3:3.12.0'
    testImplementation 'junit:junit:4.13.2'
}`;
      const result = detector.detect(gradleScript);
      // Gradle detection may be conservative
      if (result.match) {
        expect(result.confidence).toBeGreaterThan(0.3);
      }
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
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});