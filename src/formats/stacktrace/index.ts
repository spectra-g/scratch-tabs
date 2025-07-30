import { FormatModule } from "../types";
import { StacktraceFormatDetector } from "../stacktrace";
import { formatRegistry } from "../registry";

// Create the Stacktrace format module that implements the new interface
export class StacktraceFormatModule implements FormatModule {
  private detector: StacktraceFormatDetector;

  constructor() {
    this.detector = new StacktraceFormatDetector();
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
const stacktraceModule = new StacktraceFormatModule();
formatRegistry.register(stacktraceModule);

// Export for backward compatibility
export const registerStacktraceProvider = (monaco: any) => {
  stacktraceModule.registerProvider(monaco);
};
