import { FormatModule } from "../types";
import { XmlFormatDetector } from "../xml";
import { formatRegistry } from "../registry";

// Create the Xml format module that implements the new interface
export class XmlFormatModule implements FormatModule {
  private detector: XmlFormatDetector;

  constructor() {
    this.detector = new XmlFormatDetector();
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
const xmlModule = new XmlFormatModule();
formatRegistry.register(xmlModule);

// Export for backward compatibility
export const registerXmlProvider = (monaco: any) => {
  xmlModule.registerProvider(monaco);
};
