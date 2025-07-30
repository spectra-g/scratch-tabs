import { FormatModule } from "../types";
import { YamlFormatDetector } from "../yaml";
import { formatRegistry } from "../registry";

// Create the Yaml format module that implements the new interface
export class YamlFormatModule implements FormatModule {
  private detector: YamlFormatDetector;

  constructor() {
    this.detector = new YamlFormatDetector();
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
const yamlModule = new YamlFormatModule();
formatRegistry.register(yamlModule);

// Export for backward compatibility
export const registerYamlProvider = (monaco: any) => {
  yamlModule.registerProvider(monaco);
};
