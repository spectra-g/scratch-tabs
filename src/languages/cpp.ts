import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types'; 

/**
 * C++ language detector
 */
export class CppLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'cpp';
  name = 'C++';
  extensions = ['cpp', 'hpp', 'h', 'cc', 'cxx', 'hh']; // Added .hh
  priority = 5; // Adjust as needed relative to C, Java, etc.

  sampleContent(): string {
    return `#include <iostream>
#include <vector>
#include <string>

// Using namespace for convenience
using namespace std;

// Forward declaration
class MyClass;

// Template function
template <typename T>
T add(T a, T b) {
    return a + b;
}

class MyClass {
public:
    // Constructor
    MyClass(string name) : name_(name) {
        cout << "MyClass constructor called for: " << name_ << endl;
    }

    // Destructor
    ~MyClass() {
        cout << "MyClass destructor called for: " << name_ << endl;
    }

    // Member function
    void greet() {
        cout << "Hello from " << name_ << endl;
    }

    // Static member
    static int count;

private:
    string name_;
    vector<int> data_;
};

// Initialize static member
int MyClass::count = 0;

int main(int argc, char* argv[]) {
    // Using std:: directly
    std::cout << "Hello, C++!" << std::endl;

    MyClass obj1("Object1");
    obj1.greet();

    // Pointers and references
    int x = 10;
    int* ptr = &x;
    int& ref = x;

    cout << "Pointer value: " << *ptr << endl;
    cout << "Reference value: " << ref << endl;

    // Using vector
    vector<string> messages;
    messages.push_back("C++");
    messages.push_back("is");
    messages.push_back("powerful!");

    for (const string& msg : messages) {
        cout << msg << " ";
    }
    cout << endl;

    // Using template function
    cout << "Adding integers: " << add(5, 10) << endl;
    cout << "Adding doubles: " << add(3.14, 2.71) << endl;

    return 0; // Indicate successful execution
}`;
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let definitiveMatchFound = false;

    // 1. Definitive C++ patterns (higher weights)
    const definitivePatterns = [
      { pattern: /^\s*#include\s+<(iostream|vector|string|map|set|algorithm|memory|thread|fstream|sstream|iomanip)>/m, weight: 0.4, perMatch: 0.1 },
      { pattern: /\bstd::(cout|cin|cerr|endl|string|vector|map|set|unique_ptr|shared_ptr|move)\b/g, weight: 0.35, perMatch: 0.05 },
      { pattern: /\bnamespace\s+\w+\s*\{/g, weight: 0.25, perMatch: 0.05 },
      { pattern: /\bclass\s+\w+\s*\{[\s\S]*?(public|private|protected):/g, weight: 0.3, perMatch: 0.1 }, // Class with access specifiers
      { pattern: /\bstruct\s+\w+\s*\{[\s\S]*?(public|private|protected):/g, weight: 0.25, perMatch: 0.05 }, // Struct with access specifiers (more C++ like)
      { pattern: /template\s*<.*?>/g, weight: 0.3, perMatch: 0.1 },
      { pattern: /\b(new|delete)\b\s+\w+/g, weight: 0.2, perMatch: 0.05 }, // new/delete keywords
      { pattern: /\b(try|catch|throw)\b/g, weight: 0.15, perMatch: 0.05 }, // Exception handling
      { pattern: /\b\w+::\w+\b/g, weight: 0.1, perMatch: 0.02 }, // Scope resolution operator (std::cout, not ":items")
      { pattern: /\b(auto&?|const_cast|dynamic_cast|reinterpret_cast|static_cast|nullptr|override|final|noexcept|constexpr)\b/g, weight: 0.4, perMatch: 0.15 }, // C++11 and later keywords
      { pattern: /using\s+namespace\s+std;/g, weight: 0.3, perMatch: 0.1}, // Common, though not always best practice
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        confidenceScore += Math.min(matches.length, 3) * dp.perMatch; // Cap per-match bonus
        patternsMatched++;
        definitiveMatchFound = true;
      }
    }

    // 2. Common C/C++ patterns (lower weights, help if definitive ones are sparse)
    const commonPatterns = [
      { pattern: /^\s*#include\s+["<][\w.]+h[">]/m, weight: 0.1, perMatch: 0.02 }, // C-style headers
      { pattern: /\b(int|void|char|double|float|long|short|bool)\s+\w+\s*\(.*\)\s*\{/g, weight: 0.1, perMatch: 0.02 }, // Function definitions
      { pattern: /\b(printf|scanf|fprintf|fscanf|malloc|free|sizeof)\b/g, weight: -0.1, perMatch: -0.05 }, // C standard library functions - slight negative for pure C++
      { pattern: /->\w+/g, weight: 0.05, perMatch: 0.01 }, // Pointer member access
      { pattern: /\b(const\s+)?(char|int|float|double)\s*\*\s*\w+/g, weight: 0.05, perMatch: 0.01 }, // Pointer declarations
    ];

    if (!definitiveMatchFound || confidenceScore < 0.5) { // Only check common if definitive score is not already high
        for (const cp of commonPatterns) {
            const matches = content.match(cp.pattern);
            if (matches) {
                confidenceScore += cp.weight;
                confidenceScore += Math.min(matches.length, 5) * cp.perMatch;
                patternsMatched++;
            }
        }
    }
    
    // 3. Anti-patterns (e.g., from Java or JavaScript)
    const antiPatterns = [
      { pattern: /\bimport\s+[\w.*]+;/i, weight: -0.4 }, // Java import
      { pattern: /\bSystem\.out\.println\(/i, weight: -0.3 }, // Java print
      { pattern: /\bpublic\s+static\s+void\s+main\s*\(String(\[\]|\s*\.\.\.)\s+\w+\)/i, weight: -0.5 }, // Java main
      { pattern: /\b(var|let|const)\s+\w+\s*=/i, weight: -0.4 }, // JS variable declarations
      { pattern: /=>\s*\{/i, weight: -0.5 }, // JS arrow function
    ];

    for (const ap of antiPatterns) {
        if (ap.pattern.test(content)) {
            confidenceScore += ap.weight; // Apply negative weight
        }
    }

    // Boost for combined typical C++ constructs
    if (content.includes("std::") && content.includes("cout") && content.includes("<<")) {
        confidenceScore += 0.2;
    }
    if (content.includes("class") && content.includes("public:") && content.includes("private:")) {
        confidenceScore += 0.15;
    }


    // 4. Normalization and Clamping
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status based on confidence threshold
    const isMatch = confidenceScore >= 0.4; // Adjust this threshold based on testing

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  getFileExtension(): string {
      return 'cpp';
  }

  // registerProvider can remain as is, potentially with a more advanced formatter if desired
  registerProvider(monaco: any): void {
    // Currently, Monaco doesn't have a built-in C++ formatter that works out-of-the-box
    // like it does for JS/TS/JSON. Implementing a good C++ formatter with regex is
    // extremely complex. Users would typically rely on clang-format or similar tools.
    // For a scratchpad, a simple indent-adjuster might be attempted, but it's error-prone.
    // You could leave this empty or provide a very basic heuristic indenter.
    // For now, let's leave it as a no-op to avoid introducing a potentially buggy formatter.
    
    // Example of basic heuristic (highly simplified, likely buggy for complex C++):
    /*
    monaco.languages.registerDocumentFormattingEditProvider('cpp', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        let formattedText = "";
        let indentLevel = 0;
        const indentSize = 4; // Common for C++

        content.split('\n').forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('}') || trimmedLine.startsWith(")") || trimmedLine.startsWith("]")) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          if (trimmedLine.length > 0) {
            formattedText += ' '.repeat(indentLevel * indentSize) + trimmedLine + '\n';
          } else {
            formattedText += '\n'; // Preserve empty lines
          }
          if (trimmedLine.endsWith('{') || trimmedLine.endsWith("(") || trimmedLine.endsWith("[")) {
            indentLevel++;
          }
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedText.trimEnd() // Remove trailing newline if any
        }];
      }
    });
    */
  }
}

// Create and register the detector
const cppDetector = new CppLanguageDetector();
languageRegistry.register(cppDetector);

// Export for backward compatibility (optional, if you're transitioning)
export const registerCppProvider = (monaco: any) => {
  cppDetector.registerProvider(monaco);
};