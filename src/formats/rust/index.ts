import { FormatModule } from "../types";
import { RustFormatDetector } from "../rust";
import { formatRegistry } from "../registry";

// Create the Rust format module that implements the new interface
export class RustFormatModule implements FormatModule {
  private detector: RustFormatDetector;

  constructor() {
    this.detector = new RustFormatDetector();
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
const rustModule = new RustFormatModule();
formatRegistry.register(rustModule);

// Export for backward compatibility
export const registerRustProvider = (monaco: any) => {
  rustModule.registerProvider(monaco);
};
