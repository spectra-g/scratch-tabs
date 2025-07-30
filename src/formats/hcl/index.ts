import { FormatModule } from "../types";
import { HclFormatDetector } from "../hcl";
import { formatRegistry } from "../registry";

// Create the Hcl format module that implements the new interface
export class HclFormatModule implements FormatModule {
  private detector: HclFormatDetector;

  constructor() {
    this.detector = new HclFormatDetector();
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
const hclModule = new HclFormatModule();
formatRegistry.register(hclModule);

// Export for backward compatibility
export const registerHclProvider = (monaco: any) => {
  hclModule.registerProvider(monaco);
};
