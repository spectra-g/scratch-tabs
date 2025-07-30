import { FormatModule } from "../types";
import { ScalaFormatDetector } from "../scala";
import { formatRegistry } from "../registry";

// Create the Scala format module that implements the new interface
export class ScalaFormatModule implements FormatModule {
  private detector: ScalaFormatDetector;

  constructor() {
    this.detector = new ScalaFormatDetector();
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
const scalaModule = new ScalaFormatModule();
formatRegistry.register(scalaModule);

// Export for backward compatibility
export const registerScalaProvider = (monaco: any) => {
  scalaModule.registerProvider(monaco);
};
