import { PythonFormatDetector } from "../python";

describe("PythonFormatDetector", () => {
  let detector: PythonFormatDetector;

  beforeEach(() => {
    detector = new PythonFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("python");
      expect(detector.name).toBe("Python");
      expect(detector.extensions).toEqual(["py", "pyw", "pyi", "gyp", "gypi"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("py");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid Python sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("def ");
      expect(sample).toContain("class ");
      expect(sample).toContain("import ");
      expect(sample).toContain("print(");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Python function definitions", () => {
      const pythonCode = `def greet(name):
    return f"Hello, {name}!"

def main():
    message = greet("World")
    print(message)

if __name__ == "__main__":
    main()`;
      const result = detector.detect(pythonCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Python class definitions", () => {
      const pythonClass = `class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, number):
        self.result += number
        return self
    
    def subtract(self, number):
        self.result -= number
        return self
    
    def get_result(self):
        return self.result`;
      const result = detector.detect(pythonClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Python imports", () => {
      const pythonImports = `import os
import sys
from datetime import datetime
from collections import defaultdict
import numpy as np
import pandas as pd

def process_data():
    data = pd.read_csv('data.csv')
    return data.head()`;
      const result = detector.detect(pythonImports);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Python with list comprehensions", () => {
      const listComp = `numbers = [1, 2, 3, 4, 5]
squares = [x**2 for x in numbers]
evens = [x for x in numbers if x % 2 == 0]

data = {'a': 1, 'b': 2, 'c': 3}
values = [v for k, v in data.items() if v > 1]`;
      const result = detector.detect(listComp);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect Python decorators", () => {
      const decorators = `@property
def name(self):
    return self._name

@staticmethod
def create_user(name, email):
    return User(name, email)

@classmethod
def from_dict(cls, data):
    return cls(**data)`;
      const result = detector.detect(decorators);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
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
      expect(detector.detect("def").match).toBe(false);
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