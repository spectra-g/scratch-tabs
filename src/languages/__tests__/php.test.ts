import { PhpLanguageDetector } from "../php";

describe("PhpLanguageDetector", () => {
  let detector: PhpLanguageDetector;

  beforeEach(() => {
    detector = new PhpLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("php");
      expect(detector.name).toBe("PHP");
      expect(detector.extensions).toEqual(["php", "phtml", "php3", "php4", "php5", "phps"]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("php");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid PHP sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("<?php");
      expect(sample).toContain("class ");
      expect(sample).toContain("function ");
      expect(sample).toContain("$");
    });
  });

  describe("Detection Logic", () => {
    test("should detect PHP with opening tag", () => {
      const phpCode = `<?php
$name = "World";
echo "Hello, " . $name . "!";
?>`;
      const result = detector.detect(phpCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect PHP class", () => {
      const phpClass = `<?php
class User {
    private $name;
    private $email;
    
    public function __construct($name, $email) {
        $this->name = $name;
        $this->email = $email;
    }
    
    public function getName() {
        return $this->name;
    }
    
    public function getEmail() {
        return $this->email;
    }
}
?>`;
      const result = detector.detect(phpClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect PHP functions", () => {
      const phpFunctions = `<?php
function calculateSum($a, $b) {
    return $a + $b;
}

function greetUser($name = "Guest") {
    return "Hello, $name!";
}

$result = calculateSum(5, 3);
echo greetUser("John");
?>`;
      const result = detector.detect(phpFunctions);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect PHP with arrays", () => {
      const phpArrays = `<?php
$fruits = array("apple", "banana", "orange");
$person = [
    "name" => "John Doe",
    "age" => 30,
    "city" => "New York"
];

foreach ($fruits as $fruit) {
    echo $fruit . "\n";
}

echo $person["name"];
?>`;
      const result = detector.detect(phpArrays);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `function greet(name) {
    return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("<?php").match).toBe(false);
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