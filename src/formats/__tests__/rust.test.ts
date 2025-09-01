import { RustFormatDetector } from "../rust";

describe("RustFormatDetector", () => {
  let detector: RustFormatDetector;

  beforeEach(() => {
    detector = new RustFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("rust");
      expect(detector.name).toBe("Rust");
      expect(detector.extensions).toEqual(["rs"]);
      expect(detector.priority).toBe(3);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("rs");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid Rust sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("fn main()");
      expect(sample).toContain("println!");
      expect(sample).toContain("struct");
      expect(sample).toContain("impl");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Rust main function", () => {
      const rustCode = `fn main() {
    println!("Hello, World!");
    let x = 5;
    let y = 10;
    println!("x + y = {}", x + y);
}`;
      const result = detector.detect(rustCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Rust struct and impl", () => {
      const rustStruct = `struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Person {
        Person { name, age }
    }
    
    fn greet(&self) {
        println!("Hello, my name is {} and I'm {} years old", self.name, self.age);
    }
}`;
      const result = detector.detect(rustStruct);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Rust with match expressions", () => {
      const rustMatch = `fn process_number(x: i32) -> String {
    match x {
        1 => "one".to_string(),
        2 => "two".to_string(),
        3..=5 => "between three and five".to_string(),
        _ => "something else".to_string(),
    }
}`;
      const result = detector.detect(rustMatch);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect Rust with ownership", () => {
      const rustOwnership = `fn take_ownership(s: String) {
    println!("{}", s);
}

fn borrow_string(s: &String) {
    println!("{}", s);
}

fn main() {
    let s = String::from("hello");
    borrow_string(&s);
    take_ownership(s);
    // s is no longer valid here
}`;
      const result = detector.detect(rustOwnership);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should reject C++ code", () => {
      const cppCode = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`;
      const result = detector.detect(cppCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("fn").match).toBe(false);
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