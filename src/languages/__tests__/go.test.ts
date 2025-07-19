import { GoLanguageDetector } from "../go";

describe("GoLanguageDetector", () => {
  let detector: GoLanguageDetector;

  beforeEach(() => {
    detector = new GoLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("go");
      expect(detector.name).toBe("Go");
      expect(detector.extensions).toEqual(["go"]);
      expect(detector.priority).toBe(7);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("go");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid Go sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("package main");
      expect(sample).toContain("import");
      expect(sample).toContain("func main()");
      expect(sample).toContain("fmt.Println");
    });
  });

  describe("Detection Logic", () => {
    test("should detect Go main package", () => {
      const goCode = `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`;
      const result = detector.detect(goCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Go with multiple imports", () => {
      const goCode = `package main

import (
    "fmt"
    "net/http"
    "log"
)

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, World!")
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}`;
      const result = detector.detect(goCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect Go struct definitions", () => {
      const goStruct = `package models

type User struct {
    ID       int    \`json:"id"\`
    Name     string \`json:"name"\`
    Email    string \`json:"email"\`
    Active   bool   \`json:"active"\`
}

func (u *User) GetFullName() string {
    return u.Name
}`;
      const result = detector.detect(goStruct);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Go interface", () => {
      const goInterface = `package storage

type Repository interface {
    Save(entity interface{}) error
    FindByID(id int) (interface{}, error)
    Delete(id int) error
}

type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) Save(entity interface{}) error {
    // implementation
    return nil
}`;
      const result = detector.detect(goInterface);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect Go with goroutines", () => {
      const goGoroutines = `package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()
    fmt.Printf("Worker %d starting\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go worker(i, &wg)
    }
    
    wg.Wait()
    fmt.Println("All workers done")
}`;
      const result = detector.detect(goGoroutines);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect Go with channels", () => {
      const goChannels = `package main

import "fmt"

func fibonacci(c, quit chan int) {
    x, y := 0, 1
    for {
        select {
        case c <- x:
            x, y = y, x+y
        case <-quit:
            fmt.Println("quit")
            return
        }
    }
}

func main() {
    c := make(chan int)
    quit := make(chan int)
    
    go func() {
        for i := 0; i < 10; i++ {
            fmt.Println(<-c)
        }
        quit <- 0
    }()
    
    fibonacci(c, quit)
}`;
      const result = detector.detect(goChannels);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect Go error handling", () => {
      const goErrors = `package main

import (
    "errors"
    "fmt"
)

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

func main() {
    result, err := divide(10, 2)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Result: %f\n", result)
}`;
      const result = detector.detect(goErrors);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});`;
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
      expect(detector.detect("package").match).toBe(false);
    });

    test("should detect Go with generic types", () => {
      const goGenerics = `package main

import "fmt"

func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}

func main() {
    numbers := []int{1, 2, 3, 4, 5}
    doubled := Map(numbers, func(n int) int {
        return n * 2
    })
    fmt.Println(doubled)
}`;
      const result = detector.detect(goGenerics);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
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