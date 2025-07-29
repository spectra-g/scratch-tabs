import { FormatModule } from "../types";
import { AccesslogFormatDetector } from "../accesslog";
import { formatRegistry } from "../registry";

// Create the Accesslog format module that implements the new interface
export class AccesslogFormatModule implements FormatModule {
  private detector: AccesslogFormatDetector;

  constructor() {
    this.detector = new AccesslogFormatDetector();
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
const accesslogModule = new AccesslogFormatModule();
formatRegistry.register(accesslogModule);

// Export for backward compatibility
export const registerAccesslogProvider = (monaco: any) => {
  accesslogModule.registerProvider(monaco);
};
