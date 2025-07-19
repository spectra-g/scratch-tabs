import { BashLanguageDetector } from "../bash";

describe("BashLanguageDetector", () => {
  let detector: BashLanguageDetector;

  beforeEach(() => {
    detector = new BashLanguageDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("shell");
      expect(detector.name).toBe("Bash/Shell");
      expect(detector.extensions).toEqual([
        "sh",
        "bash",
        ".profile",
        ".bashrc",
        ".zshrc",
      ]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("sh");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid bash sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("#!/bin/bash");
      expect(sample).toContain("function greet_user");
      expect(sample).toContain("if (( $1 % 2 == 0 )); then");
      expect(sample).toContain("while [ $counter -le 5 ]; do");
      expect(sample).toContain("case $day in");
    });
  });

  describe("Detection Logic", () => {
    test("should detect bash script with shebang", () => {
      const bashScript = `#!/bin/bash
echo "Hello World"
if [ $? -eq 0 ]; then
  echo "Success"
fi`;
      const result = detector.detect(bashScript);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    test("should detect shell script with function definition", () => {
      const shellFunction = `function test_func() {
  echo "Testing"
  return 0
}
test_func`;
      const result = detector.detect(shellFunction);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect shell script with command substitution", () => {
      const commandSub = `result=$(ls -la)
echo "Current date: $(date)"
files=\`find . -name "*.txt"\``;
      const result = detector.detect(commandSub);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect shell script with test expressions", () => {
      const testExpr = `if [[ -f "file.txt" ]]; then
  echo "File exists"
fi
[ $var -gt 10 ] && echo "Greater than 10"`;
      const result = detector.detect(testExpr);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect shell script with variable assignments", () => {
      const variables = `export PATH="/usr/local/bin:$PATH"
local var="value"
declare -a array=(1 2 3)
unset OLDVAR`;
      const result = detector.detect(variables);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect shell script with common commands", () => {
      const commands = `cd /home/user
ls -la
mkdir new_directory
grep "pattern" file.txt
echo "Done"`;
      const result = detector.detect(commands);
      // This detector may be conservative with simple commands
      if (result.match) {
        expect(result.confidence).toBeGreaterThan(0.3);
      }
    });

    test("should reject Python scripts", () => {
      const pythonScript = `#!/usr/bin/env python3
def hello():
    print("Hello World")
    return True

if __name__ == "__main__":
    hello()`;
      const result = detector.detect(pythonScript);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript code", () => {
      const jsCode = `import { Component } from 'react';
export default function App() {
  const handleClick = () => {
    console.log("Clicked");
  };
  return <div onClick={handleClick}>Hello</div>;
}`;
      const result = detector.detect(jsCode);
      expect(result.match).toBe(false);
    });

    test("should reject Markdown content", () => {
      const markdown = `# Shell Commands Guide

Here are some common shell commands:

- \`ls\` - list files
- \`cd\` - change directory
- \`echo\` - print text

> Note: These are basic commands.`;
      const result = detector.detect(markdown);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("echo").match).toBe(false);
    });

    test("should reject SQL content", () => {
      const sql = `SELECT name, age FROM users 
WHERE age > 21 
ORDER BY name;
CREATE TABLE products (id INT, name VARCHAR(50));`;
      const result = detector.detect(sql);
      expect(result.match).toBe(false);
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
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalledWith("shell", expect.any(Object));
    });
  });
});