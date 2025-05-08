import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Properties/INI language detector
 */
export class PropertiesLanguageDetector extends BaseLanguageDetector {
  id = 'properties';
  name = 'Properties';
  extensions = ['properties', 'ini'];
  priority = 3;

  sampleContent(): string {
    return `key1=value1
key2=value2
# This is a comment`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    const lines = content.split('\n').map(l => l.trim());
    // Count lines matching key=value (ignore comments starting with # or ;)
    const kvLines = lines.filter(l => /^[^#;][^=]+=[^=]+$/.test(l));
    return kvLines.length >= 2;
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for Properties by default
  }
}

const propertiesDetector = new PropertiesLanguageDetector();
languageRegistry.register(propertiesDetector);
export const registerPropertiesProvider = (monaco: any) => {
  propertiesDetector.registerProvider(monaco);
}; 