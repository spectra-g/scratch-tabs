import { FormatModule } from "../types";
import { PropertiesFormatDetector } from "../properties";
import { formatRegistry } from "../registry";

// Create the Properties format module that implements the new interface
export class PropertiesFormatModule implements FormatModule {
  private detector: PropertiesFormatDetector;

  constructor() {
    this.detector = new PropertiesFormatDetector();
  }

  get id(): string {
    return this.detector.id;
  }

  get name(): string {
    return this.detector.name;
  }

  get extensions(): string[] {
    return this.detector.extensions;
  }

  get priority(): number {
    return this.detector.priority;
  }

  detect(content: string) {
    return this.detector.detect(content);
  }

  registerProvider(monaco: any): void {
    this.detector.registerProvider(monaco);
  }

  sampleContent(): string {
    return this.detector.sampleContent();
  }

  getFileExtension(): string {
    return this.detector.getFileExtension();
  }
}

// Create and register the module
const propertiesModule = new PropertiesFormatModule();
formatRegistry.register(propertiesModule);

// Export for backward compatibility
export const registerPropertiesProvider = (monaco: any) => {
  propertiesModule.registerProvider(monaco);
};
