import { FormatModule } from "../types";
import { RFormatDetector } from "../r";
import { formatRegistry } from "../registry";

// Create the R format module that implements the new interface
export class RFormatModule implements FormatModule {
  private detector: RFormatDetector;

  constructor() {
    this.detector = new RFormatDetector();
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
const rModule = new RFormatModule();
formatRegistry.register(rModule);

// Export for backward compatibility
export const registerRProvider = (monaco: any) => {
  rModule.registerProvider(monaco);
};
