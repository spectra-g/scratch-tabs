import { FormatModule } from "../types";
import { SvgFormatDetector } from "../svg";
import { formatRegistry } from "../registry";

// Create the Svg format module that implements the new interface
export class SvgFormatModule implements FormatModule {
  private detector: SvgFormatDetector;

  constructor() {
    this.detector = new SvgFormatDetector();
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
const svgModule = new SvgFormatModule();
formatRegistry.register(svgModule);

// Export for backward compatibility
export const registerSvgProvider = (monaco: any) => {
  svgModule.registerProvider(monaco);
};
