import { JavaScriptFormatDetector } from "../javascript";

describe("JavascriptFormatDetector", () => {
  let detector: JavaScriptFormatDetector;

  beforeEach(() => {
    detector = new JavaScriptFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("javascript");
      expect(detector.name).toBe("JavaScript");
      expect(detector.extensions).toEqual(["js", "jsx", "mjs"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("js");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid JavaScript sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("function");
      expect(sample).toContain("let");
      expect(sample).toContain("console.log");
      expect(sample).toContain("function");
    });
  });

  describe("Detection Logic", () => {
    test("should detect JavaScript with function declarations", () => {
      const jsCode = `function greet(name) {
    return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect JavaScript with arrow functions", () => {
      const arrowFunctions = `const add = (a, b) => a + b;
const multiply = (x, y) => {
    return x * y;
};

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);`;
      const result = detector.detect(arrowFunctions);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect JavaScript with class syntax", () => {
      const jsClass = `class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(number) {
        this.result += number;
        return this;
    }
    
    subtract(number) {
        this.result -= number;
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

const calc = new Calculator();
const result = calc.add(5).subtract(2).getResult();`;
      const result = detector.detect(jsClass);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.75);
    });

    test("should detect JavaScript with async/await", () => {
      const asyncCode = `async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

const processData = async () => {
    const data = await fetchData('https://api.example.com/data');
    console.log(data);
};`;
      const result = detector.detect(asyncCode);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect JavaScript with destructuring", () => {
      const destructuring = `const user = {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
};

const { name, age } = user;
const [first, second] = ['hello', 'world'];

const processUser = ({ name, age, ...rest }) => {
    console.log(\`User: \${name}, Age: \${age}\`);
    return rest;
};`;
      const result = detector.detect(destructuring);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect JavaScript with module imports/exports", () => {
      const modules = `import React, { useState, useEffect } from 'react';
import { Router } from 'express';
import * as utils from './utils';

export const MyComponent = () => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        console.log(\`Count: \${count}\`);
    }, [count]);
    
    return <div onClick={() => setCount(count + 1)}>{count}</div>;
};

export default MyComponent;`;
      const result = detector.detect(modules);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect JavaScript with CommonJS", () => {
      const commonjs = `const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = {
    app,
    startServer: (port) => {
        app.listen(port, () => {
            console.log(\`Server running on port \${port}\`);
        });
    }
};`;
      const result = detector.detect(commonjs);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test("should detect JavaScript with promises", () => {
      const promises = `function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

Promise.all([
    fetch('/api/users'),
    fetch('/api/posts'),
    delay(1000)
])
.then(([usersResponse, postsResponse]) => {
    return Promise.all([
        usersResponse.json(),
        postsResponse.json()
    ]);
})
.then(([users, posts]) => {
    console.log('Data loaded:', { users, posts });
})
.catch(error => {
    console.error('Error:', error);
});`;
      const result = detector.detect(promises);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should detect JSX syntax", () => {
      const jsx = `import React from 'react';

const TodoItem = ({ todo, onToggle, onDelete }) => {
    return (
        <div className={todo.completed ? 'completed' : ''}>
            <input 
                type="checkbox" 
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
            />
            <span>{todo.text}</span>
            <button onClick={() => onDelete(todo.id)}>Delete</button>
        </div>
    );
};

export default TodoItem;`;
      const result = detector.detect(jsx);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test("should reject Java code", () => {
      const javaCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
        List<String> list = new ArrayList<>();
    }
}`;
      const result = detector.detect(javaCode);
      expect(result.match).toBe(false);
    });

    test("should reject Python code", () => {
      const pythonCode = `def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    message = greet("World")
    print(message)`;
      const result = detector.detect(pythonCode);
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
      expect(detector.detect("const").match).toBe(false);
    });

    test("should detect JavaScript with template literals", () => {
      const templateLiterals = `const name = 'John';
const age = 30;

const message = \`Hello, my name is \${name} and I am \${age} years old.\`;

const html = \`
    <div class="user">
        <h1>\${name}</h1>
        <p>Age: \${age}</p>
    </div>
\`;

console.log(message);`;
      const result = detector.detect(templateLiterals);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect JavaScript with spread operator", () => {
      const spreadOperator = `const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];

const obj1 = { name: 'John', age: 30 };
const obj2 = { email: 'john@example.com' };
const user = { ...obj1, ...obj2 };

function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}`;
      const result = detector.detect(spreadOperator);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
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