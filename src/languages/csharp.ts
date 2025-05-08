import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * C# language detector
 */
export class CsharpLanguageDetector extends BaseLanguageDetector {
  id = 'csharp';
  name = 'C#';
  extensions = ['cs'];
  priority = 5;

  sampleContent(): string {
    return `using System;
namespace MyApp {
  class Program {
    static void Main(string[] args) {
      Console.WriteLine("Hello, C#!");
    }
  }
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /^\s*using\s+[A-Za-z0-9_.]+;/.test(content)
        || /^\s*namespace\s+[A-Za-z0-9_.]+/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for C# by default
  }
}

const csharpDetector = new CsharpLanguageDetector();
languageRegistry.register(csharpDetector);
export const registerCsharpProvider = (monaco: any) => {
  csharpDetector.registerProvider(monaco);
}; 