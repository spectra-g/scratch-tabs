import { FormatModule } from "../types";
import { PythonFormatDetector } from "../python";
import { formatRegistry } from "../registry";

// Create the Python format module that implements the new interface
export class PythonFormatModule implements FormatModule {
  private detector: PythonFormatDetector;

  constructor() {
    this.detector = new PythonFormatDetector();
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
const pythonModule = new PythonFormatModule();
formatRegistry.register(pythonModule);

// Export for backward compatibility
export const registerPythonProvider = (monaco: any) => {
  pythonModule.registerProvider(monaco);
};
