import { CsharpFormatDetector } from "../csharp";

describe("CsharpFormatDetector", () => {
  let detector: CsharpFormatDetector;

  beforeEach(() => {
    detector = new CsharpFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("csharp");
      expect(detector.name).toBe("C#");
      expect(detector.extensions).toEqual(["cs", "csx"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("cs");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid C# sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("using System;");
      expect(sample).toContain("namespace MyAwesomeApp");
      expect(sample).toContain("public class");
      expect(sample).toContain("static async Task Main");
      expect(sample).toContain("Console.WriteLine");
    });
  });

  describe("Detection Logic", () => {
    test("should detect C# code with using statements", () => {
      const csharpCode = `using System;
using System.Collections.Generic;

namespace MyApp {
    public class Program {
        static void Main(string[] args) {
            Console.WriteLine("Hello World");
        }
    }
}`;
      const result = detector.detect(csharpCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect C# class with properties", () => {
      const csharpClass = `public class Person {
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public int Age { get; set; }
    
    public string FullName => $"{FirstName} {LastName}";
}`;
      const result = detector.detect(csharpClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect C# interface", () => {
      const csharpInterface = `public interface IRepository<T> {
    Task<T> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}`;
      const result = detector.detect(csharpInterface);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect C# record types", () => {
      const recordType = `using System;

public record Person(string FirstName, string LastName, int Age);

public class PersonService {
    public Person CreatePerson(string first, string last, int age) {
        return new Person(first, last, age);
    }
}`;
      const result = detector.detect(recordType);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect LINQ expressions", () => {
      const linqCode = `var adults = people
    .Where(p => p.Age >= 18)
    .Select(p => new { p.Name, p.Age })
    .OrderBy(p => p.Name)
    .ToList();

var result = from p in people
             where p.Age > 21
             select p.Name;`;
      const result = detector.detect(linqCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect async/await patterns", () => {
      const asyncCode = `public async Task<string> GetDataAsync() {
    using var client = new HttpClient();
    var response = await client.GetAsync("https://api.example.com");
    return await response.Content.ReadAsStringAsync();
}

public async Task ProcessAsync() {
    await Task.Delay(1000);
    Console.WriteLine("Processing complete");
}`;
      const result = detector.detect(asyncCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should reject Java code", () => {
      const javaCode = `import java.util.List;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Java");
        List<String> list = new ArrayList<>();
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

let variable = 'value';`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject C++ code", () => {
      const cppCode = `#include <iostream>
using namespace std;

class MyClass {
public:
    void method() {
        cout << "Hello C++" << endl;
    }
};`;
      const result = detector.detect(cppCode);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("var").match).toBe(false);
    });

    test("should detect nullable reference types", () => {
      const nullableCode = `using System;
using System.Linq;

public class UserService {
    public string? GetUserName(int? userId) {
        if (userId == null) return null;
        return users.FirstOrDefault(u => u.Id == userId)?.Name;
    }
}`;
      const result = detector.detect(nullableCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
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