import { FormatModule } from "../types";
import { VhostFormatDetector } from "../vhost";
import { formatRegistry } from "../registry";

// Create the Vhost format module that implements the new interface
export class VhostFormatModule implements FormatModule {
  private detector: VhostFormatDetector;

  constructor() {
    this.detector = new VhostFormatDetector();
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
const vhostModule = new VhostFormatModule();
formatRegistry.register(vhostModule);

// Export for backward compatibility
export const registerVhostProvider = (monaco: any) => {
  vhostModule.registerProvider(monaco);
};
