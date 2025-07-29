import { FormatModule } from "../types";
import { JsonFormatDetector } from "../json";
import { formatRegistry } from "../registry";

// Create the JSON format module that implements the new interface
// while preserving the legacy methods for backward compatibility
export class JsonFormatModule implements FormatModule {
  private detector: JsonFormatDetector;

  constructor() {
    this.detector = new JsonFormatDetector();
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

  // Legacy methods for backward compatibility (Phase 1)
  getStatusItem() {
    return this.detector.getStatusItem();
  }

  getOptionsMenu() {
    return this.detector.getOptionsMenu();
  }
}

// Create and register the module
const jsonModule = new JsonFormatModule();
formatRegistry.register(jsonModule);

// Export for backward compatibility
export const registerJsonProvider = (monaco: any) => {
  jsonModule.registerProvider(monaco);
}; 