import { FormatModule } from "../types";
import { DiffFormatDetector } from "../diff";
import { formatRegistry } from "../registry";

// Create the Diff format module that implements the new interface
export class DiffFormatModule implements FormatModule {
  private detector: DiffFormatDetector;

  constructor() {
    this.detector = new DiffFormatDetector();
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
const diffModule = new DiffFormatModule();
formatRegistry.register(diffModule);

// Export for backward compatibility
export const registerDiffProvider = (monaco: any) => {
  diffModule.registerProvider(monaco);
};
