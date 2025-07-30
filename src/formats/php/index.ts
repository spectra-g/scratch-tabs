import { FormatModule } from "../types";
import { PhpFormatDetector } from "../php";
import { formatRegistry } from "../registry";

// Create the Php format module that implements the new interface
export class PhpFormatModule implements FormatModule {
  private detector: PhpFormatDetector;

  constructor() {
    this.detector = new PhpFormatDetector();
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
const phpModule = new PhpFormatModule();
formatRegistry.register(phpModule);

// Export for backward compatibility
export const registerPhpProvider = (monaco: any) => {
  phpModule.registerProvider(monaco);
};
