import { FormatModule } from "../types";
import { BashFormatDetector } from "../bash";
import { formatRegistry } from "../registry";

// Create the Bash format module that implements the new interface
export class BashFormatModule implements FormatModule {
  private detector: BashFormatDetector;

  constructor() {
    this.detector = new BashFormatDetector();
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
const bashModule = new BashFormatModule();
formatRegistry.register(bashModule);

// Export for backward compatibility
export const registerBashProvider = (monaco: any) => {
  bashModule.registerProvider(monaco);
};
