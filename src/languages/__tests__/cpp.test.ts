import { CppLanguageDetector } from "../cpp";

describe("CppLanguageDetector", () => {
  let detector: CppLanguageDetector;

  beforeEach(() => {
    detector = new CppLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("cpp");
      expect(detector.name).toBe("C++");
      expect(detector.extensions).toEqual([
        "cpp",
        "hpp",
        "h",
        "cc",
        "cxx",
        "hh",
      ]);
      expect(detector.priority).toBe(5);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("cpp");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid C++ sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("#include <iostream>");
      expect(sample).toContain("using namespace std;");
      expect(sample).toContain("template <typename T>");
      expect(sample).toContain("class MyClass {");
      expect(sample).toContain("int main(int argc, char* argv[])");
    });
  });

  describe("Detection Logic", () => {
    test("should detect C++ code with iostream and std namespace", () => {
      const cppCode = `#include <iostream>
#include <vector>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    vector<int> nums = {1, 2, 3};
    return 0;
}`;
      const result = detector.detect(cppCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect C++ code with std:: namespace", () => {
      const cppCode = `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello World" << std::endl;
    std::string name = "C++";
    std::cout << "Language: " << name << std::endl;
    return 0;
}`;
      const result = detector.detect(cppCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect C++ class with access specifiers", () => {
      const cppClass = `class MyClass {
public:
    MyClass();
    ~MyClass();
    void method();
    
private:
    int value_;
    std::string name_;
    
protected:
    void protectedMethod();
};`;
      const result = detector.detect(cppClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect C++ templates", () => {
      const templateCode = `template <typename T>
class Container {
public:
    void add(const T& item) {
        items_.push_back(item);
    }
    
private:
    std::vector<T> items_;
};

template <class T>
T maximum(T a, T b) {
    return (a > b) ? a : b;
}`;
      const result = detector.detect(templateCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect C++11 features", () => {
      const cpp11Code = `#include <memory>
#include <vector>

auto main() -> int {
    auto ptr = std::make_unique<int>(42);
    auto lambda = [](int x) -> int { return x * 2; };
    
    std::vector<int> nums{1, 2, 3, 4};
    for (const auto& num : nums) {
        std::cout << lambda(num) << std::endl;
    }
    
    return 0;
}`;
      const result = detector.detect(cpp11Code);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect namespace declarations", () => {
      const namespaceCode = `namespace MyNamespace {
    class Calculator {
    public:
        int add(int a, int b) {
            return a + b;
        }
    };
}

using namespace MyNamespace;`;
      const result = detector.detect(namespaceCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject Java code", () => {
      const javaCode = `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
        ArrayList<String> list = new ArrayList<>();
        list.add("item");
    }
}`;
      const result = detector.detect(javaCode);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

let variable = 'value';
const arrow = () => {
    console.log('Arrow function');
};`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
    "name": "John Doe",
    "age": 30,
    "skills": ["C++", "Python", "JavaScript"],
    "address": {
        "street": "123 Main St",
        "city": "Anytown"
    }
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("int").match).toBe(false);
    });

    test("should detect exception handling", () => {
      const exceptionCode = `#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("Error occurred");
    } catch (const std::exception& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
    }
    return 0;
}`;
      const result = detector.detect(exceptionCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect pointer operations", () => {
      const pointerCode = `#include <iostream>

int main() {
    int x = 10;
    int* ptr = &x;
    int** doublePtr = &ptr;
    
    std::cout << "Value: " << *ptr << std::endl;
    std::cout << "Address: " << ptr << std::endl;
    
    ptr->someMethod(); // Member access through pointer
    return 0;
}`;
      const result = detector.detect(pointerCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
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