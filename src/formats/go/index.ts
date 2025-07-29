import { FormatModule } from "../types";
import { GoFormatDetector } from "../go";
import { formatRegistry } from "../registry";

// Create the Go format module that implements the new interface
export class GoFormatModule implements FormatModule {
  private detector: GoFormatDetector;

  constructor() {
    this.detector = new GoFormatDetector();
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
const goModule = new GoFormatModule();
formatRegistry.register(goModule);

// Export for backward compatibility
export const registerGoProvider = (monaco: any) => {
  goModule.registerProvider(monaco);
};
