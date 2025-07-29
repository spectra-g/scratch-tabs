import { FormatModule } from "../types";
import { RubyFormatDetector } from "../ruby";
import { formatRegistry } from "../registry";

// Create the Ruby format module that implements the new interface
export class RubyFormatModule implements FormatModule {
  private detector: RubyFormatDetector;

  constructor() {
    this.detector = new RubyFormatDetector();
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
const rubyModule = new RubyFormatModule();
formatRegistry.register(rubyModule);

// Export for backward compatibility
export const registerRubyProvider = (monaco: any) => {
  rubyModule.registerProvider(monaco);
};
