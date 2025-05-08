import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * C++ language detector
 */
export class CppLanguageDetector extends BaseLanguageDetector {
  id = 'cpp';
  name = 'C++';
  extensions = ['cpp', 'hpp', 'h', 'cc', 'cxx'];
  priority = 5;

  sampleContent(): string {
    return `#include <iostream>
using namespace std;

int main() {
  cout << "Hello, C++!" << endl;
  return 0;
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /^\s*#include\s+<[^>]+>/.test(content)
        || /\bstd::\w+/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for C++ by default
  }
}

const cppDetector = new CppLanguageDetector();
languageRegistry.register(cppDetector);
export const registerCppProvider = (monaco: any) => {
  cppDetector.registerProvider(monaco);
}; 