import { FormatModule } from "../types";
import { JsonlogFormatDetector } from "../jsonlog";
import { formatRegistry } from "../registry";

// Create the Jsonlog format module that implements the new interface
export class JsonlogFormatModule implements FormatModule {
  private detector: JsonlogFormatDetector;

  constructor() {
    this.detector = new JsonlogFormatDetector();
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
const jsonlogModule = new JsonlogFormatModule();
formatRegistry.register(jsonlogModule);

// Export for backward compatibility
export const registerJsonlogProvider = (monaco: any) => {
  jsonlogModule.registerProvider(monaco);
};
