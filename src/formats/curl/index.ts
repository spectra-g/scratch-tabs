import { FormatModule } from "../types";
import { CurlFormatDetector } from "../curl";
import { formatRegistry } from "../registry";

// Create the Curl format module that implements the new interface
export class CurlFormatModule implements FormatModule {
  private detector: CurlFormatDetector;

  constructor() {
    this.detector = new CurlFormatDetector();
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
const curlModule = new CurlFormatModule();
formatRegistry.register(curlModule);

// Export for backward compatibility
export const registerCurlProvider = (monaco: any) => {
  curlModule.registerProvider(monaco);
};
