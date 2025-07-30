import { FormatModule } from "../types";
import { JavaScriptFormatDetector } from "../javascript";
import { formatRegistry } from "../registry";

// Create the JavaScript format module that implements the new interface
export class JavascriptFormatModule implements FormatModule {
  private detector: JavaScriptFormatDetector;

  constructor() {
    this.detector = new JavaScriptFormatDetector();
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
const javascriptModule = new JavascriptFormatModule();
formatRegistry.register(javascriptModule);

// Export for backward compatibility
export const registerJavascriptProvider = (monaco: any) => {
  javascriptModule.registerProvider(monaco);
};
