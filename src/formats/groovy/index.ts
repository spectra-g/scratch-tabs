import { FormatModule } from "../types";
import { GroovyFormatDetector } from "../groovy";
import { formatRegistry } from "../registry";

// Create the Groovy format module that implements the new interface
export class GroovyFormatModule implements FormatModule {
  private detector: GroovyFormatDetector;

  constructor() {
    this.detector = new GroovyFormatDetector();
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
const groovyModule = new GroovyFormatModule();
formatRegistry.register(groovyModule);

// Export for backward compatibility
export const registerGroovyProvider = (monaco: any) => {
  groovyModule.registerProvider(monaco);
};
