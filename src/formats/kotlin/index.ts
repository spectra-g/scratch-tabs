import { FormatModule } from "../types";
import { KotlinFormatDetector } from "../kotlin";
import { formatRegistry } from "../registry";

// Create the Kotlin format module that implements the new interface
export class KotlinFormatModule implements FormatModule {
  private detector: KotlinFormatDetector;

  constructor() {
    this.detector = new KotlinFormatDetector();
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
const kotlinModule = new KotlinFormatModule();
formatRegistry.register(kotlinModule);

// Export for backward compatibility
export const registerKotlinProvider = (monaco: any) => {
  kotlinModule.registerProvider(monaco);
};
