import { FormatModule } from "../types";
import { CsharpFormatDetector } from "../csharp";
import { formatRegistry } from "../registry";

// Create the Csharp format module that implements the new interface
export class CsharpFormatModule implements FormatModule {
  private detector: CsharpFormatDetector;

  constructor() {
    this.detector = new CsharpFormatDetector();
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
const csharpModule = new CsharpFormatModule();
formatRegistry.register(csharpModule);

// Export for backward compatibility
export const registerCsharpProvider = (monaco: any) => {
  csharpModule.registerProvider(monaco);
};
