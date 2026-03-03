import { FormatModule } from "../types";
import { formatRegistry } from "../registry";
import { TomlFormatDetector } from "./toml-detector";
import { registerTomlProvider } from "./toml-monaco-provider";
import { getTomlSampleContent } from "./toml-sample-content";

export class TomlFormatModule implements FormatModule {
  private detector: TomlFormatDetector;

  constructor() {
    this.detector = new TomlFormatDetector();
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
    registerTomlProvider(monaco);
  }

  sampleContent(): string {
    return getTomlSampleContent();
  }

  getSampleContent(): string {
    return this.sampleContent();
  }

  getFileExtension(): string {
    return "toml";
  }
}

const tomlModule = new TomlFormatModule();
formatRegistry.register(tomlModule);

export const registerTomlLanguageProvider = (monaco: any): void => {
  tomlModule.registerProvider(monaco);
};
