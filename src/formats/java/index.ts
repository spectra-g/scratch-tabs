import { FormatModule } from "../types";
import { JavaFormatDetector } from "../java";
import { formatRegistry } from "../registry";

// Create the Java format module that implements the new interface
export class JavaFormatModule implements FormatModule {
  private detector: JavaFormatDetector;

  constructor() {
    this.detector = new JavaFormatDetector();
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
const javaModule = new JavaFormatModule();
formatRegistry.register(javaModule);

// Export for backward compatibility
export const registerJavaProvider = (monaco: any) => {
  javaModule.registerProvider(monaco);
};
