import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

export class CssLanguageDetector extends BaseLanguageDetector {
  id = 'css';
  name = 'CSS';
  extensions = ['css'];
  priority = 2;

  sampleContent(): string {
    return `body { margin:0; padding:0; }`;
  }

  isMatch(content: string): boolean {
    // quick check for brace-based syntax and semicolons
    return /[.#]?[a-zA-Z0-9_-]+\s*\{/.test(content)
        && /;/.test(content);
  }

  // you can configure a formatting/highlight provider here
  registerProvider(monaco: any): void {
    // no-op or add monaco.css support
  }
}

const cssDetector = new CssLanguageDetector();
languageRegistry.register(cssDetector);
export const registerCssProvider = (monaco: any) =>
  cssDetector.registerProvider(monaco);
