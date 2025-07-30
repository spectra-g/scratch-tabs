import { FormatModule } from "../types";
import { CppFormatDetector } from "../cpp";
import { formatRegistry } from "../registry";

// Create the Cpp format module that implements the new interface
export class CppFormatModule implements FormatModule {
  private detector: CppFormatDetector;

  constructor() {
    this.detector = new CppFormatDetector();
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
const cppModule = new CppFormatModule();
formatRegistry.register(cppModule);

// Export for backward compatibility
export const registerCppProvider = (monaco: any) => {
  cppModule.registerProvider(monaco);
};
